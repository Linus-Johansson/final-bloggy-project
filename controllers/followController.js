const Follow = require("../models/FollowModel")

exports.addFollow = (req, res) => {
    let follow = new Follow(req.params.username, req.visitorID);// creates a new instance of the follow model
    // creates a new follow document in the DB - X user is now following Y user. 
    follow.create().then(() => {// if promies is successfull..
        req.flash("success", `successfully followed ${req.params.username}`);// we create a flash message that indicates success.
        req.session.save(() => {res.redirect(`/profile/${req.params.username}`)})// then we redirect user back to the followed persons profile
    }).catch((errors) => {// if promies is not  successfull..
        errors.forEach((error)=>{// we loop through the error that the promise rejected with, the function is run once for each error.
            req.flash("errors",error);// for each error, we create a flash message
            req.session.save(() => {res.redirect("/")});// after the foreach is done we save the session data and redirect back to the homepage.
        });
    })
}

exports.removeFollow = (req, res) => {
    let follow = new Follow(req.params.username, req.visitorID);// creates a new instance of the follow model
    // creates a new follow document in the DB - X user is now following Y user.
    follow.delete().then(() => {// if promies is successfull..
        req.flash("success", `successfully stopped following ${req.params.username}`);// we create a flash message that indicates success.
        req.session.save(() => {res.redirect(`/profile/${req.params.username}`)})// then we redirect user back to the followed persons profile
    }).catch((errors) => {// if promies is not  successfull..
        errors.forEach((error)=>{// we loop through the error that the promise rejected with, the function is run once for each error.
            req.flash("errors",error);// for each error, we create a flash message
            req.session.save(() => {res.redirect("/")});// after the foreach is done we save the session data and redirect back to the homepage.
        });
    })
}