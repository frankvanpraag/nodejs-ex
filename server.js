//  OpenShift sample Node application
// const fs           = require('fs');
// const path         = require('path');
// //const storage      = require('node-persist');
// const contentTypes = require('./utils/content-types');
// const sysInfo      = require('./utils/sys-info');
// var   env          = process.env;
// var   http         = require('http');
// var   request      = require('request');
// var   util         = require('util');

var express = require('express'),
    app     = express(),
    morgan  = require('morgan');
    
Object.assign=require('object-assign')

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'))

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
      mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
      mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
      mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
      mongoPassword = process.env[mongoServiceName + '_PASSWORD']
      mongoUser = process.env[mongoServiceName + '_USER'];

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;

  }
}
var db = null,
    dbDetails = new Object();

var initDb = function(callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};

app.get('/', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    var col = db.collection('counts');
    // Create a document with request IP and current time of request
    col.insert({ip: req.ip, date: Date.now()});
    col.count(function(err, count){
      res.render('index.html', { pageCountMessage : count, dbInfo: dbDetails });
    });
  } else {
    res.render('index.html', { pageCountMessage : null});
  }
});

app.get('/fvp', function (req, res) {
  res.send('Good morning to Frank.');
});

app.get('/set', function (req, res) {
  console.log('Set request is processing...');
  // extract parameters
  var surveyID = req.query.surveyID;
  var panelID = req.query.panelID;
  var recipientID = req.query.recipientID;
  var responseID = req.query.responseID;
  var name  = req.query.name;                   // Name (of name-value-pair)
  var value = req.query.value;                  // Value (of name-value-pair)
  var filter = {
                surveyID: surveyID,
                panelID: panelID,
                recipientID: recipientID,
                responseID: responseID,
                name: name
            };

  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    try {
        var col = db.collection('nvpairs');
        var valueJSON = {
                surveyID: surveyID,
                panelID: panelID,
                recipientID: recipientID,
                responseID: responseID,
                name: name,
                value: value,
                date: Date.now()
            };
        console.log('valueJSON = %j', valueJSON);
        // Create/replace a document
        col.replaceOne( filter, valueJSON, { upsert: true } );
        res.send({ result: 'success', rc: 0 });
    } catch (e) {
        res.send({ result: e, rc: 8 });
        console.log('e = %j', e);
        console.log('e = %s', e);
    };

  } else {
    res.send({ result: 'failed', rc: 4 });
  }
});

app.get('/getJSON', function (req, res) {
  console.log('Get JSON request is processing...');
  // extract parameters
  var surveyID = req.query.surveyID;
  var panelID = req.query.panelID;
  var recipientID = req.query.recipientID;
  var responseID = req.query.responseID;
  var name  = req.query.name;                   // Name (of name-value-pair)
  var value = req.query.value;                  // Value (of name-value-pair)
  if (value !== undefined) {
      res.send({ result: 'failed', rc: 12 , info: 'unexpected value passed. Not allowed.'});
      return;
  }
  var filter = {
                surveyID: surveyID,
                panelID: panelID,
                recipientID: recipientID,
                responseID: responseID,
                name: name
            };

  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    try {
        var col = db.collection('nvpairs');
        // Create a document with request IP and current time of request
        col.findOne( filter , function(err, doc) {
            if (!doc)
                res.send({ result: 'success', rc: 0, info: 'not found' });
            else {
                //console.log('Raw Doc: %j', doc);
                //console.log('Value %s', doc.value);
                //console.log('JSONValue %j', doc.value);
                res.send({ value: doc, result: 'success', rc: 0 });
            }
        } );
    } catch (e) {
        console.log('e = %j', e);
        res.send({ result: 'failed', rc: 8 });
    };
  } else {
    res.send({ result: 'failed', rc: 4 });
  }
});


app.get('/get', function (req, res) {
  console.log('Get request is processing...');
  // extract parameters
  var surveyID = req.query.surveyID;
  var panelID = req.query.panelID;
  var recipientID = req.query.recipientID;
  var responseID = req.query.responseID;
  var name  = req.query.name;                   // Name (of name-value-pair)
  var value = req.query.value;                  // Value (of name-value-pair)
  if (value !== undefined) {
      res.send(value);                          // Silly - return value passed
      return;
  }
  var filter = {
                surveyID: surveyID,
                panelID: panelID,
                recipientID: recipientID,
                responseID: responseID,
                name: name
            };

  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    try {
        var col = db.collection('nvpairs');
        col.findOne( filter , function(err, doc) {
            if (!doc)
                res.send('');
            else {
                //console.log('Raw Doc: %j', doc);
                //console.log('Value %s', doc.value);
                //console.log('JSONValue %j', doc.value);
                res.send(doc.value);
            }
        } );
    } catch (e) {
        console.log('e = %j', e);
        res.send({ result: 'failed', rc: 8 });
    };
  } else {
    res.send({ });
  }
});
    
app.get('/pagecount', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    db.collection('counts').count(function(err, count ){
      res.send('{ pageCount: ' + count + '}');
    });
  } else {
    res.send('{ pageCount: -1 }');
  }
});

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

app.listen(port, ip);
console.log('FvP Server is hurling along on http://%s:%s', ip, port);

module.exports = app ;
