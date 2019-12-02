const bcrypt = require("bcryptjs");
const usersCollections = require("../db").db().collection("users");
const validator = require("validator");
const md5 = require("md5");

class User{
    constructor(data, getAvatar){
        this.data = data;
        this.errors = [];

        if(getAvatar == undefined){
            getAvatar = false;
        }
        if(getAvatar){
            this.getAvatar();
        }
    }
   
    // method that cleans the usersubmitted data, making sure its only text.
    cleanUp(){
        // if the username value is anything other than a type of string
        if(typeof(this.data.username) != "string"){
            this.data.username = "";// set the username's value to an empty string
        }
        if(typeof(this.data.email) != "string"){
            this.data.email = "";// set the email's value to an empty string
        }
        if(typeof(this.data.password) != "string"){
            this.data.password = "";// set the password's value to an empty string
        }

        // get rid of any weird properties
        this.data = {
            username: this.data.username.trim().toLowerCase(),
            email: this.data.email.trim().toLowerCase(),
            password: this.data.password
        }
        
    }
    
       
        validate(){
            return new Promise(async (resolve,reject)=>{

                if(this.data.username ==""){ this.errors.push("You must provide a valid username");}
                if(this.data.username != "" && !validator.isAlphanumeric(this.data.username)){this.errors.push("username can only contain letters and numbers");}
                if(!validator.isEmail(this.data.email)){ this.errors.push("You must provide a valid email address");} 
                if(this.data.password ==""){ this.errors.push("You must provide a valid password");}
                if(this.data.password.length > 0 && this.data.password.length < 12){this.errors.push("Password must be at least 12 chars long");}
                if(this.data.password.length > 50){this.errors.push("Password can not exceed 50 chars.");}
                if(this.data.username.length > 0 && this.data.username.length < 3){this.errors.push("username must be at least 3 chars long");}
                if(this.data.username.length > 30){this.errors.push("username can not exceed 30 chars.");}
        
                // TODO: Only if username is valid, then check to see if its already taken.
                if(this.data.username.length > 2 && this.data.username.length < 31 && validator.isAlphanumeric(this.data.username)){
                    let userNameExsists = await usersCollections.findOne({username: this.data.username})
                    if(userNameExsists){this.errors.push("This username is already taken")}
                }
        
                 // TODO: Only if email is valid, then check to see if it's already taken.
                 if(validator.isEmail(this.data.email)){
                    let emailExsists = await usersCollections.findOne({email: this.data.email})
                    if(emailExsists){this.errors.push("This email is already being used")}
                }
                resolve();
            })
        }

    login(){
       return new Promise((resolve, reject)=>{
        this.cleanUp();
        usersCollections.findOne({username: this.data.username}).then((attemptedUser)=>{
            
            if(attemptedUser && bcrypt.compareSync(this.data.password, attemptedUser.password)){
                this.data = attemptedUser;
                this.getAvatar();
                resolve("Congrats!");
            }else{
               reject("invalid username or password!");
                
            }
        }).catch(()=>{
            reject("Server problem, please try again later.");
        })
       })
    }
    
        register(){
            return new Promise(async (resolve, reject)=>{
                // step #1 validate usr data
                this.cleanUp();
                await this.validate();
                // step # 2 only if there are no validation errors
                // then save user into a database 
                if(!this.errors.length){
                    // hash userpassword.
                    let salt = bcrypt.genSaltSync(10);
                    this.data.password = bcrypt.hashSync(this.data.password, salt);
                    // add an object into a collection.
                    await usersCollections.insertOne(this.data);
                    this.getAvatar();
                    resolve();
                }else{
                    reject(this.errors);
                }
            })
        }
    getAvatar(){
        this.avatar =`https://www.gravatar.com/avatar/${md5(this.data.email)}?s=128`
    }

    static findByUserName(username){
        
        return new Promise((resolve, reject)=>{

            if(typeof(username) !="string"){// if it's anything other than a string
                reject();// reject promise
                return;// return to prevent further execution of this function
            }
            
            // we want a dokument where the username field matches whatever username value was at the end of the URL 
            usersCollections.findOne({username: username}).then((userDoc)=>{
                
                // if it resolves, it resolves with the data it found, for example: a document
                if(userDoc){// if userdoc exsists,
                
                // then
                userDoc = new User(userDoc,true);// takes the raw data from DB to create a new user document
     
                // here we specify what properties our userDoc object  to have and get passed back into the controler
                userDoc = {
                    _id: userDoc.data._id,// so we can lookup posts later
                    username: userDoc.data.username,// username
                    avatar: userDoc.avatar // avatar propertie
                }
                resolve(userDoc);
                }else{
                // if it coundt find a matching user, it rejects.
                reject();
                }
            }).catch(()=>{
            // error related to DB
            reject();
            })
        })
    }
    
}

module.exports = User;