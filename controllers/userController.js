const User = require("../models/User");
const PostModel = require("../models/PostModel");
const FollowModel = require("../models/FollowModel");


exports.sharedProfileData = async (req, res, next) =>{
    let isVisitorsProfile = false;
    let isFollowing = false;
    if(req.session.user){// if current user is logged in
        // // gets the current MongoDB Object ID-Object for the current profile user
        isVisitorsProfile = req.profileUser._id.equals(req.session.user._id); //MongoDB Object ID-Object gets checked against the current session user id.
        isFollowing = await FollowModel.isVisitorFollowing(req.profileUser._id, req.visitorID);// we check if user is currently following the profile. 
    }
    req.isVisitorsProfile = isVisitorsProfile;
    req.isFollowing = isFollowing;// the result is stored on the request object.
    
    
    //TODO: retrive post, following, and follower count data
    let postCountPromise = PostModel.countPostsByAuthor(req.profileUser._id);
    let followerCountPromise = FollowModel.countFollowersById(req.profileUser._id);
    let followingCountPromise = FollowModel.countFollowingById(req.profileUser._id);
    let [postCount, followerCount, followingCount] = await Promise.all([postCountPromise, followerCountPromise, followingCountPromise]);
    
    req.postCount = postCount;
    req.followerCount = followerCount;
    req.followingCount = followingCount;

    next();// so we can use it wihin the next function for this route.

       
}



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

exports.home = async (req, res)=>{
    
    if(req.session.user){
        // fetch feed of posts for current user¨
        let posts = await PostModel.getFeed(req.session.user._id)
        res.render("home-dashboard", {posts: posts});// render ejs template with data that we want passed into this template.
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
}/*
//TODO delete Soon
exports.sharedProfileData = async (req, res, next) =>{
    let isVisitorsProfile = false;
    let isFollowing = false;
    if(req.session.user){// if current user is logged in
        // // gets the current MongoDB Object ID-Object for the current profile user
        isVisitorsProfile = req.profileUser._id.equals(req.session.user._id); //MongoDB Object ID-Object gets checked against the current session user id.
        isFollowing = await FollowModel.isVisitorFollowing(req.profileUser._id, req.visitorID);// we check if user is currently following the profile. 
    }
    req.isVisitorsProfile = isVisitorsProfile;
    req.isFollowing = isFollowing;// the result is stored on the request object.
    next();// so we can use it wihin the next function for this route.
}*/

exports.profilePostScreen = (req, res)=>{
    
    // ask our postModel for a certain author id.
    PostModel.findByAuthorId(req.profileUser._id).then((posts)=>{
    // here we want to render our template with the promise's post data.
    res.render("profile", {
        currentPage: "posts",
        posts: posts,   
        profileUserName: req.profileUser.username,
        profileAvatar: req.profileUser.avatar,
        isFollowing: req.isFollowing,
        isVisitorsProfile: req.isVisitorsProfile,
        counts: {
            postCount: req.postCount,
            followerCount: req.followerCount,
            followingCount: req.followingCount
        }
    });
    }).catch(()=>{
    // if this run, the problem relates to an unforseen or technical issue
    res.render("404");
    })
}

exports.profileFollowersScreen = async (req, res)=>{
    try {
        
        let followers = await FollowModel.getFollowersById(req.profileUser._id);// populated with users & avatars.
        res.render("profile-followers",{
        currentPage: "followers",
        followers: followers,// followersList passed into  the template profile-followers.
        profileUserName: req.profileUser.username,
        profileAvatar: req.profileUser.avatar,
        isFollowing: req.isFollowing,
        isVisitorsProfile: req.isVisitorsProfile,
        counts: {
            postCount: req.postCount,
            followerCount: req.followerCount,
            followingCount: req.followingCount
        }
    });
    } catch (error) {
        
    }
}

exports.profileFollowingScreen = async(req, res) => {
    try {
        
        let following = await FollowModel.getFollowingById(req.profileUser._id);// populated with users & avatars.
        res.render("profile-following",{
        currentPage: "following",
        following: following,// followingList passed into the template profile-following.
        profileUserName: req.profileUser.username,
        profileAvatar: req.profileUser.avatar,
        isFollowing: req.isFollowing,
        isVisitorsProfile: req.isVisitorsProfile,
        counts: {
            postCount: req.postCount,
            followerCount: req.followerCount,
            followingCount: req.followingCount
        }
    });
    } catch (error) {
        
    }
}



