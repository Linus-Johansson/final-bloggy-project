/*
App.js is the file i use to enable new features within my express application.
*/ 

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);// blueprint to create a new object.
const flash = require("connect-flash");
const markDown = require("marked");
const sanitizeHTML = require("sanitize-html");
const app = express();



const router = require("./router");


// config for enableing sessions
let sessionOptions = session({
    secret: "JavaScript is so cool",
    store: new MongoStore({client: require("./db")}), 
    resave: false, 
    saveUninitialized: false,
    cookie: {maxAge: 1000 * 60 * 60 * 24, httpOnly:true}
});


/* 
// lets ur express server know where it can find our templates.
// lets server know which template engine where gonna use. in this case ( EJS ) <===. 
// app.use(express.static("public")) tells server to make that folder accessible.
*/

app.use(sessionOptions);
app.use(flash());

//run this function for every request
app.use((req, res, next)=>{
    // make out markdown function available from within ejs templates
    res.locals.filterUserHTML = (content)=>{
        return sanitizeHTML(markDown(content), {allowedTags:["p","br","ul","ol","li","strong","i","em","h1","h2","h3","h4","h5","h6"], allowedAttributes:{  }});
    }

    // make all error and success flash messages available from all requests.
    res.locals.errors = req.flash("errors");
    res.locals.success = req.flash("success");
    // make current user id available on the req object.
    if(req.session.user){
        req.visitorID = req.session.user._id
    }else{
        req.visitorID = 0;
    }
    // make usersession data available from within view templates
    res.locals.user = req.session.user;
    next();
});

app.use(express.static("public"));
app.use(express.urlencoded({extended: false}));// adds user submitted data to our req object.
app.use(express.json());
app.set("views","views"); 
app.set("view engine","ejs");

app.use("/", router)

module.exports = app;

