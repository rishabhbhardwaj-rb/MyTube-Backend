import mongoose, {Schema} from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userSchema = new Schema({
    username:{
        type: String,
        required: true,
        lowercase: true,
        unique: true,
        trim: true,
        index: true
    },
    email:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password:{
        type: String,
        required: [true,"Password is required"]
    },
    fullName:{
        type: String,
        required: true,
        trim: true,
        index: true
    },
    avatar: {
        type: String,
        required: true
    },
    coverImage:{
        type: String
    },
    refreshToken:{
        type: String
    },
    watchHistory:[{
        type:Schema.Types.ObjectId,
        ref:"Video"
    }]
},{timestamps:true});

userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next();
    this.password =  await bcrypt.hash(this.password, 10);
    next();
    console.log("calling next() doesn't mean the execution of further statements will stop");
});

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password);
}
userSchema.methods.accessTokenGenerator = function(){
    return jwt.sign({
        _id:this._id,
        email:this.email,
        username:this.username,
        fullName:this.fullName
    },
    process.env.ACCESS_TOKEN_SECRET,
    {expiresIn:process.env.ACCESS_TOKEN_EXPIRY});
}

userSchema.methods.refreshTokenGenerator = function(){
    return jwt.sign({
        _id:this._id
    },
    process.env.REFRESH_TOKEN_SECRET,
    {expiresIn:process.env.REFRESH_TOKEN_EXPIRY});
}



export const User = mongoose.model("User", userSchema);