import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from "../models/user.model.js"
import { uploadCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res
    const {username, email, fullName, password} = req.body;
    //console.log(email);
    if(
        [username, email, fullName, password].some((field)=> field?.trim() === "" )
    ){
        throw new ApiError(400, "Required fields are missing");
    }
    const existingUser = await User.findOne({
        $or:[{username},{email}]
    });
    if(existingUser){
        throw new ApiError(409, "User already exist");
    }
    //console.log("hello");
    console.log(req.files);
    let avatarLocalPath;
    if(req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0){
        avatarLocalPath = req.files.avatar[0].path;
    }
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    if(!avatarLocalPath){
        throw new ApiError(400, "avatar file is required");
    }
    const avatar = await uploadCloudinary(avatarLocalPath);
    const coverImage = await uploadCloudinary(coverImageLocalPath);
    //console.log(avatar);
    if(!avatar){
        throw new ApiError(400, "avatar file is required.")
    }
    const user = await User.create({
        username,
        email,
        fullName,
        password,
        avatar:avatar.url,
        coverImage:coverImage?.url || ""
    });
    //console.log(user);
    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user");
    }
    //console.log(createdUser);

    res.status(201).json(
        new ApiResponse(
            200,
            createdUser,
            "User registered successfully"
        )
    );
});

export {registerUser};