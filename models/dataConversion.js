var query = require('./query');
var async = require('async');
var syncloop = require('./syncloop.js');
var attributeId = [];
var categoryId = [];

module.exports =
{
  attributeId, categoryId,
  // allows admin to create new forms
  //self explanatory name of function
  makeCategory: function(reqBody, reqUser,res, req)
  {
    query.newQuery("SELECT * FROM categories WHERE Description = '" + reqBody.newCategory + "'", function (err,data)
    {
      if(data.length > 0)
      {
        req.flash('duplicate category', 'duplicate category!');
        res.render("createRows.ejs",
        {
            attriMessage: "",
            catMessage: req.flash('duplicate category'),
            successMessage: ""
        });
      }
      else
      {
        query.newQuery("INSERT INTO categories (Description) VALUES ('" + reqBody.newCategory + "')", function(err, data)
        {
          res.render("createRows.ejs",
          {
              attriMessage: "",
              catMessage: "",
              successMessage: "Successfully added category!"
          });
        });
      }
    });
  },
  makeAttribute: function(reqBody, reqUser,res, req)
  {
    query.newQuery("SELECT * FROM attributes WHERE Description = '" + reqBody.newAttribute + "'", function (err,data)
    {
      //checks so see if attribute already exists or not
      if(data.length > 0)
      {
        req.flash('duplicate attribute', 'duplicate attribute!');
        res.render("createRows.ejs",
        {
            attriMessage: req.flash('duplicate attribute'),
            catMessage: "",
            successMessage: ""
        });
      }
      else
      {
        //creates new attribute, inserts into database
        query.newQuery("INSERT INTO attributes (Description) VALUES ('" + reqBody.newAttribute + "')", function(err, data)
        {
          //success page
          res.render("createRows.ejs",
          {
              attriMessage: "",
              catMessage: "",
              successMessage: "Successfully added attribute!"
          });
        });
      }
    });
  },
  makeForm: function(reqBody, reqUser, res, req, callback)
  {
    //work on this dynamic naming is fnished...just need to update the queries
    var categoryNum = 1;
    var attributeNum = 1;
    //variables to get the correct element in req.body
    var currentAttribute = "attribute" + String(attributeNum);
    var currentCategory = "category" + String(categoryNum);
    //NEED CHECK
    query.newQuery("SELECT * FROM form WHERE Title = '" + reqBody.groupTitle + "'", function(err, returnedForms)
    {
      if(returnedForms.length < 1)
      {
      query.newQuery("INSERT INTO form (Title, GroupNumber) VALUES('" + reqBody.groupTitle + "', " + reqBody.groupNumber + ")", function(err, data)
      {
        //a synchronous while loop so javascript actually does stuff in order. If unfamiliar, would be nice to look it up
        async.whilst(
        function() {return (reqBody[currentAttribute] != null) },
        function(cb)
        {
          //selects attributes from the ejs form and inserts it into the formattribute table in the database
          query.newQuery("SELECT ID FROM attributes WHERE Description = '" + reqBody[currentAttribute] + "';", function(err, data1)
          {
            console.log(reqBody[currentAttribute]);
            query.newQuery("INSERT INTO formattribute (attributeID, formID) VALUES ('" + data1[0].ID + "'," + data.insertId + ");", function(err, data2)
            {
            attributeNum ++;
            currentAttribute = "attribute" + String(attributeNum);
            cb(null, reqBody[currentAttribute]);
            });

           });
        },
      function(err)
      {
        async.whilst(
          function() {return (reqBody[currentCategory] != null) },
          function(cb)
          {
            //selects categories from the ejs form and inserts it into the formcategory table in the database
            query.newQuery("SELECT ID FROM categories WHERE Description = '" + reqBody[currentCategory] + "';", function(err, data3)
            {
              query.newQuery("INSERT INTO formcategory (categoryID, formID) VALUES ('" + data3[0].ID + "'," + data.insertId + ");", function(err, data4)
              {
                categoryNum ++;
                currentCategory = "category" + String(categoryNum);
                cb(null, reqBody[currentCategory]);
                if(reqBody[currentCategory] == null)
                {
                  callback();
                }
              });
            });
          }
        );
      });
      })
    }
    else
    {
      query.newQuery("SELECT * FROM categories", function(err, categories)
      {
        query.newQuery("SELECT * FROM attributes", function(err, attributes)
        {
          console.log(categories);
          res.render('customtable.ejs',
          {
            chooseAttri: attributes,
            chooseCat: categories,
            messages: "problem!"
          });
        })
      })
    }
    });
  },
  //processes data in the form that user fills out and sends info to database
  //takes in 2 array parameters
  //used in the app.post(/fillForm) page in program.js
  processData: function(reqBody, reqUser, reqQuery, categoryArray, attributeArray, callback)
  {

    //synchronous for loop
    syncloop.synchIt(categoryArray.length, function(loop)
    {
      //another synchronous for loop
      syncloop.synchIt1(attributeArray.length, function(loop1)
      {
        var index = String(loop.iteration()+1) + String(loop1.iteration()+1);
        console.log(index);
        //checks to see if user already submitted form or not
        query.newQuery("SELECT * FROM datavalues WHERE CategoryID = " + categoryArray[loop.iteration()][0].ID + " AND AttributeID = " + attributeArray[loop1.iteration()][0].ID + " AND userID =" + reqUser.ID + " AND formID = " + reqQuery.formId, function(err, array)
        {
          if(array.length >0)
          {
            //update datavaues because user already submitted the form
            query.newQuery("UPDATE datavalues SET Value ='" + reqBody[index] + "' WHERE CategoryID =" + categoryArray[loop.iteration()][0].ID + " AND AttributeID =" + attributeArray[loop1.iteration()][0].ID + " AND userID = " + reqUser.ID + " AND formID = " + reqQuery.formId, function(err, data)
            {
              loop1.next();
              if(index == String(categoryArray.length) + String(attributeArray.length))
              {
                console.log(loop.iteration()+1);
                console.log(loop1.iteration()+1);
                callback();
              }
            })
          }
          //this else statement will be accessed if this is the first time the user submits the form
          else
          {
            query.newQuery("INSERT INTO datavalues (Value, CategoryID, AttributeID, userID, formID) VALUES('" + reqBody[index] + "'," + categoryArray[loop.iteration()][0].ID + "," + attributeArray[loop1.iteration()][0].ID + "," + reqUser.ID + "," + reqQuery.formId + ");",
            function(err,data)
            {
                loop1.next();
                  
                console.log(String(categoryArray.length) + String(attributeArray.length))
                if(index == String(categoryArray.length) + String(attributeArray.length))
                {
                  console.log(loop.iteration()+1);
                  console.log(loop1.iteration()+1);
                  callback();
                }
            });
          }
        });
      },function()
        {
            loop.next();

        })

    });
  }
}
