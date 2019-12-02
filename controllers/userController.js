const User = require("../models/User");
const PostModel = require("../models/PostModel");
exports.mustBeLoggedIn = (req, res, next)=>{
    if(req.session.user){// there's only ever gonna be a userobject within the sessiondata if a user is sucsuessfylly logged in.
        next();// call the next function in this route
    }else{
        req.flash("errors","You must be logged in to perform this action!");
        req.session.save(()=>{
            res.redirect("/");
        });
    }
}

// if the login is successfull, the promise returns resolve
// then the code in the then runs.
exports.login = (req, res)=>{
    let user = new User(req.body);
    //user.login() is  the promise
    user.login().then((result)=>{
        req.session.user = {avatar: user.avatar, username: user.data.username, _id: user.data._id}
        // the session package is recognizing that we are changing the session data. and auto update session data in the DB. 
        // this is a async action, this can take a while to complete. becasue of this we cant just run res.redirect rigth away. 
        // because of this we can use res.session.save() to tell it to save manually.
        // now the redirect action will be performed after the session has been saved to the DB.
        req.session.save(()=>{
            res.redirect("/");
        });
    }).catch((error)=>{
        // flash package will add a flashobject to the req object
        // it takes two arguments, first is an array/collection of messages
        //  second argument represnts the actual messages you want to add on to the array/collection.
        // error is the value my promise is going to reject with, which gets passed into the function. the flash pckg just helps add or remove data from the session
        req.flash("errors", error);// req.session.flash.errors= [error]
        req.session.save(()=>{
            res.redirect("/");
        });
    });

}
// if the incoming request has an cookie with a valid or mathcing session id 
// session.destroy() is going to find it in the DB and destory that session. 
exports.logout = (req, res)=>{
    req.session.destroy(()=>{
        res.redirect("/");
    });
    
}

exports.register = (req, res)=>{
    
    const user = new User(req.body);
    user.register().then(()=>{
        req.session.user = {username: user.data.username, avatar: user.avatar, _id: user.data._id}
        req.session.save(()=>{
            res.redirect("/");
        });
    }).catch((regErrors)=>{

       regErrors.forEach((error)=>{
            req.flash("regErrors",error)
        });
        req.session.save(()=>{
            res.redirect("/");
        });
    });
    // checks if there are any errors in the regristration
    
}

exports.dashBoard = ()=>{}

exports.home = (req, res)=>{
    
    if(req.session.user){
        res.render("home-dashboard");// render ejs template with data that we want passed into this template.
    }else{
        res.render("home-guest",{regErrors:req.flash("regErrors")});
    }
}

exports.ifUserExsists = (req, res, next)=>{
  
    User.findByUserName(req.params.username).then((userDocument)=>{
    req.profileUser = userDocument;// a new property on the request ojbect gets set to the userdocument from the DB.
    next();// lets the caller know to run the next function called.
  }).catch(()=>{
    res.render("404");
  })
}

exports.profilePostScreen =(req, res)=>{
    
    // ask our postModel for a certain author id.
    PostModel.findByAuthorId(req.profileUser._id).then((posts)=>{
    // here we want to render our template with the promise's post data.
    res.render("profile", {
        posts: posts,
        profileUserName: req.profileUser.username,
        profileAvatar: req.profileUser.avatar
    });
    }).catch(()=>{
    // if this run, the problem relates to an unforseen or technical issue
    res.render("404");
    })
}