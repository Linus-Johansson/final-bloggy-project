// this file is a reuseable file that pulls in our Database by exporting the mongoDB client.
const postCollections = require("../db").db().collection("posts");// represents mongoDB post collection
const followsCollection = require("../db").db().collection("follows");
const User = require("./User");
const objectId = require("mongodb").ObjectID;
const sanitizeHTML = require("sanitize-html");

class Post{
    
    constructor(data,userId, requestedPostId){
        this.data = data;
        this.userId = userId;
        this.errors = [];
        this.requestedPostId = requestedPostId;
    }

    cleanUp(){
        
        if(typeof(this.data.title)!="string"){
            
            this.data.title = "";
        }
        if(typeof(this.data.body) !="string"){
            
            this.data.body = "";
        }
        //get rid of weird properties.
        this.data = {
            title: sanitizeHTML(this.data.title.trim(), {allowedTags: [], allowedAttributes:{}}),
            body: sanitizeHTML(this.data.body.trim(), {allowedTags: [], allowedAttributes:{}}),
            createdDate:new Date(),
            author: objectId(this.userId)
        }
    }

    validate(){

        if(this.data.title == ""){
            this.errors.push("You must provide a title.");
        }
        if(this.data.body == ""){
            this.errors.push("You must provide post content.");
        }

    }

    create(){

        return new Promise((resolve, reject)=>{
            this.cleanUp(); // cleans the data 
            this.validate();// validates the data 

            if(!this.errors.length){// if there's no errors
                // save post into DB.
                // we pass in an object that we want stored as an document in the DB
                postCollections.insertOne(this.data).then((info)=>{
                    resolve(info.ops[0]._id);
                }).catch(()=>{
                    this.errors.push("Please try again later");
                    reject(this.errors);
                })
            }else{
                // reject 
                reject(this.errors);
            }
        })
    }

    static reuseablePostQuery(uniqueOperations, visitorID){
        return new Promise(async (resolve, reject)=>{

            let aggOperations = uniqueOperations.concat([

                {$lookup: {from: "users",localField: "author", foreignField: "_id", as: "authorDocument"}},
                {$project: {
                    title: 1,
                    body: 1,
                    createdDate: 1,
                    authorId: "$author",
                    author: {$arrayElemAt:["$authorDocument",0]}
                }}
            ]);
            
            // find a document where the _id field has a value that matches the incoming req id from the URL.
            let posts = await postCollections.aggregate(aggOperations).toArray()

            // clean up author propertie in each post object.
            posts = posts.map((post)=>{

                post.isVisitorOwner = post.authorId.equals(visitorID);
                post.authorId = undefined;

                post.author = {
                    username: post.author.username,
                    avatar: new User(post.author,true).avatar
                }
                return post;
            })
            resolve(posts);
        })
    }


    
    static findSingleByID(id, visitorID){
        return new Promise(async (resolve, reject)=>{
            // if the id is not a simple string or a valid mongo id 
            if(typeof(id)!= "string" || !objectId.isValid(id)){
                reject();
                return;
            }
            let posts = await Post.reuseablePostQuery([
                {$match: {_id: new objectId(id)}}
            ], visitorID)

            if(posts.length){// if a document is found, it will be true else it will be null which results in a false value.
                            
                resolve(posts[0])// resolve with the post document/documents.
            }else{
                reject();
            }
        })
    }

    static findByAuthorId(authorID){
       return Post.reuseablePostQuery([
           {$match: {author: authorID}},
           {$sort:{createdDate: -1}}
       ]);
    }

    actuallyUpdate(){
        return new Promise(async (resolve, reject)=>{
            this.cleanUp();
            this.validate();

            if(!this.errors.length){
                await postCollections.findOneAndUpdate({_id: new objectId(this.requestedPostId)}, {$set:{title: this.data.title, body: this.data.body}})
                resolve("success");
            }else{
            resolve("failure");
            }
        });
    }

    update(){
        return new Promise(async (resolve, reject)=>{
            try {
                let post = await Post.findSingleByID(this.requestedPostId, this.userId);
                // if 
                if(post.isVisitorOwner){
                // actually update DB
                let status = await this.actuallyUpdate();
                resolve(status);
                }else{
                reject();
                }
            } catch (error) {
                reject();
            }
        })
    }
    // this method gets passed the requested post ID and current visitor ID from the controler.
    static delete(postIdToDelete, currentUserId){
        return new Promise(async (resolve, reject)=>{

            try {
                let post = await Post.findSingleByID(postIdToDelete, currentUserId)// returns a promise
                if(post.isVisitorOwner){// if true
                    // here we take care of the deletion..by working with the object representing the DB Collection.
                    await postCollections.deleteOne({_id: new objectId(postIdToDelete)})
                    resolve()// DB action is done, resolves the promise.
                }else{// else the promise should reject, it could mean that someone is trying to delete a post they dont own.
                    reject();
                }
            } catch (error) {// if the catch runs it should also reject, could mean post id is not valid or post dosent exsists
                reject();
            }


        })
    }
     // if searchterm is not a string or if a weird request is sent without a searchterm at all, then searchterm would be undefined
    static search(searchTerm){
        return new Promise(async (resolve, reject)=>{
            if(typeof(searchTerm) == "string"){
                let posts = await Post.reuseablePostQuery([
                    {$match: {$text: {$search: searchTerm}}},
                    {$sort: {score: {$meta: "textScore"}}}
                ]);
                resolve(posts);
            }else{
                reject();
            }
        })
    }

    static countPostsByAuthor(id){
        return new Promise(async (resolve, reject)=>{
            let postCount = await postCollections.countDocuments({author: id})// tells MongoDB which documents it should look for and count.
            resolve(postCount);
        });
    }
    static async getFeed(id){
        // create an array of the user id's that the current user follows.
        let followedUsers = await followsCollection.find({authorID: new objectId(id)}).toArray();
        followedUsers = followedUsers.map((followDoc)=>{
            return followDoc.followedID
        })
        // look for posts where the author is in the above array of followed users.
        return Post.reuseablePostQuery([
            {$match: {author: {$in: followedUsers}}},// find any post document, where the author-value is a value that is in the followedUsers array.
            {$sort: {createdDate: -1}}// sorted so that the newest post is at the top.
        ]); 
    }
}



module.exports = Post;