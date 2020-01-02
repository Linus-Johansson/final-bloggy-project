// require in databasefile.gets the exported mongoDB-client
const usersCollection = require("../db").db().collection("users");
const followsCollection = require("../db").db().collection("follows");
const ObjectID = require("mongodb").ObjectID; //  specifies which mongodb package we want. 
const UserModel = require("./User");

class Follow{
    constructor(followedUserName, authorID){
        this.followedUserName = followedUserName;
        this.authorID = authorID;
        this.errors = [];
    }

    cleanUp(){
        if(typeof(this.followedUserName) != "string"){
            this.followedUserName ="";
        }
    }

    async validate(action){
    // followed username must exsist in DB
     let followedAccount = await usersCollection.findOne({username:this.followedUserName});// looking for a document where the username property matches our "this.followedUserName" 
     //console.log(followedAccount);
     if(followedAccount){// if we find an acount
        this.followedID = followedAccount._id;
    }else{// if not 
        this.errors.push("You can not follow a user that does not exsist.");// push an error onto the follow errors array.
    }
    // here we look in the followsCollection DB to see if there is a document that matches our query.
    let doesFollowAlreadyExsist = await followsCollection.findOne({followedID: this.followedID, authorID: new ObjectID(this.authorID)});
    if(action == "create"){
        console.log(doesFollowAlreadyExsist);
        if(doesFollowAlreadyExsist){// checks to see that the profile the user wants to follow isnt already being followed.
            this.errors.push("You are already following this user!")
        }
    }
    if(action == "delete"){
        console.log(doesFollowAlreadyExsist);
        if(!doesFollowAlreadyExsist){// checks to see that the profile the user wants to stop following is being followed.
            this.errors.push("You can't stop following a profile you're not following!")
        }
    }
    // should not be able to follow yourself
    if(this.followedID.equals(this.authorID)){
        this.errors.push("You can not follow your own profile!")
    }
    }

    create(){
        return new Promise(async (resolve, reject) =>{
            this.cleanUp();
            await this.validate("create");

            if(!this.errors.length){// if there are no errors..
            // store follow data in follow DB
            await followsCollection.insertOne({followedID: this.followedID, authorID:new ObjectID(this.authorID)});
            resolve();
            }else{// if  there are errors.
                reject(this.errors);
            }
        });
    }

    // method for no longer following a profile.
    delete(){
        return new Promise(async (resolve, reject) =>{
            this.cleanUp();
            await this.validate("delete");

            if(!this.errors.length){// if there are no errors..
                //remove follow from DB.
                await followsCollection.deleteOne({followedID: this.followedID, authorID:new ObjectID(this.authorID)});
            resolve();
            }else{// if  there are errors.
                reject(this.errors);
            }
        });
    }


    // checks to see if there is an exsisting document ib the DB where the followedID matches the current profile being viewed
    // and and the authorID matches the current account logged in. 
     static async isVisitorFollowing(followedId, visitorID){
        let followDoc = await followsCollection.findOne({followedID: followedId, authorID: new ObjectID(visitorID)});

        if(followDoc){// if a document matching the query
            return true;
        }else{// if no match is found.
            return false;
        }
    }

    // $match: find any documents in the followscollection where the followedID-field matches whatever id was passed into the function.
    // $lookup: where looking in the userscollection where the _id matches the authorID from the follow document.
    // $project: here we can spell out what should exsist in the object that this ultimatly returns
    static getFollowersById(id){
        return new Promise(async (resolve, reject)=>{
           
            try {
            let followers = await followsCollection.aggregate([
                {$match: {followedID: id}}, //looking for documents in followCollection where the followID matches the current id 
                {$lookup: {from: "users", localField: "authorID", foreignField: "_id", as: "userDoc"}},
                {$project:{
                    username: {$arrayElemAt: ["$userDoc.username",0]},
                    email: {$arrayElemAt: ["$userDoc.email",0]}
                }}
            ]).toArray();
            
            followers = followers.map((follower)=>{
                let user = new UserModel(follower, true);
                return {username: follower.username, avatar: user.avatar}
            });

            resolve(followers);

           } catch (error) {
               reject();
           }
        })
    }

    static getFollowingById(id){
        
        return new Promise(async (resolve, reject)=>{
            try {
            let following = await followsCollection.aggregate([
                {$match: {authorID: id}},//looking for documents where the authorID matches the current id 
                {$lookup: {from: "users", localField: "followedID", foreignField: "_id", as: "userDoc"}},
                {$project:{
                    username: {$arrayElemAt: ["$userDoc.username",0]},
                    email: {$arrayElemAt: ["$userDoc.email",0]}
                }}
            ]).toArray();

            following = following.map((follower) => {
                let user = new UserModel(follower, true);
                return {username: follower.username, avatar: user.avatar}
            });
            
            resolve(following);

           } catch (error) {
               reject();
           }
        })
    }

    static countFollowersById(id){
        return new Promise(async (resolve, reject)=>{
            let followerCount = await followsCollection.countDocuments({followedID: id})// tells MongoDB which documents it should look for and count.
            resolve(followerCount);
        });
    }

    static countFollowingById(id){
        return new Promise(async (resolve, reject)=>{
            let followingCount = await followsCollection.countDocuments({authorID: id})// tells MongoDB which documents it should look for and count.
            resolve(followingCount);
        });
    }

    

}

module.exports = Follow;