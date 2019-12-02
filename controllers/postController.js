const Post = require("../models/PostModel")

exports.viewCreateScreen = (req, res)=>{
    res.render("create-post");
}
/**
 * the create-method returns a promise 
 * then() will handle things if the promise resoves
 * catch() will handle things if the promise rejects/ fails
 * 
 */
exports.create = (req, res)=>{
    let post = new Post(req.body,req.session.user._id);

    post.create().then((newID) => {
       req.flash("success","New post successfully created.");
       req.session.save(()=>res.redirect(`/post/${newID}`))  
    }).catch((err) => {
        errors.forEach(error => req.flash("errors",error));
        req.session.save(()=> res.redirect("create-post"));
    });
}

exports.viewSingle = async (req, res)=>{
   try {
       let post = await Post.findSingleByID(req.params.id, req.visitorID);// find single post document by id 
       res.render("single-post-screen",{post: post});
   } catch (error) {
       res.render("404");
   }
}

exports.viewEditScreen = async (req, res)=>{
  
try {
    let post = await Post.findSingleByID(req.params.id, req.visitorID)
    if (post.isVisitorOwner) {
      res.render("edit-post", {post: post})
    } else {
      req.flash("errors", "You do not have permission to perform that action.")
      req.session.save(() => res.redirect("/"))
    }
  } catch(error){
    res.render("404")
  }
}


exports.edit = (req, res)=>{
    
    let post = new Post(req.body, req.visitorID, req.params.id);
    post.update().then((status)=>{
    // the post was successfully updated in the database 
    // or user did have permission but there were validation errors.
    if(status == "success"){
    // post was updated in DB
    req.flash("success", "post successfully updated");
    req.session.save(()=>{
        res.redirect(`/post/${req.params.id}/edit`);
    })
    }else{
        post.errors.forEach((error)=>{
            req.flash("errors",error)
        });
        req.session.save(()=>{
            res.redirect(`/post/${req.params.id}/edit`);
        })
    }

    }).catch(()=>{
    // a post with the requested id  dosen't exsist.
    // or if the current visitor is not the owner of the requested post.
    req.flash("errors", "You do not have permission to perform that action!")
    req.session.save(()=>{
        res.redirect("/");
    })
    });
}

exports.delete = (req, res)=>{
    
    Post.delete(req.params.id, req.visitorID).then(()=>{
        
        req.flash("success", "Post successfully deleted");
        req.session.save(()=>{
            res.redirect(`/profile/${req.session.user.username}`)
        });

    }).catch(()=>{

        req.flash("errors","You do not have permisson to perform that action!");
        req.session.save(()=>{
            res.redirect("/")
        });
        
    })
}