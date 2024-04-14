import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from "../models/user.model.js"
import { uploadCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const options = {
    httpOnly: true,
    secure: true
}

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.accessTokenGenerator();
        const refreshToken = user.refreshTokenGenerator();
        user.refreshToken = refreshToken;
        await user.save();
        return {accessToken, refreshToken};
    } catch (error) {
      throw new ApiError(500, "Something went wrong while generating Access and Refresh Token");  
    }
}

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
    //console.log(req.files);
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

const loginUser = asyncHandler(async (req, res) => {
    //get login detail from req
    //validate the login detail - not empty
    //search the database for the username
    //compare the password with database password
    //generate access and refresh token
    const {username, email, password} = req.body;
    // if([username, password].some((field) => field?.trim() === "")){
    //     throw new ApiError(400, "Required field/s is/are missing");
    // }
    if(!username&&!email){
        throw new ApiError(400, "Required field/s is/are missing");
    }
    const user = await User.findOne({
        $or:[{username},{email}]
    });

    if(!user){
        throw new ApiError(404, "username not found");
    }
    const passwordMatched = await user.isPasswordCorrect(password);
    if(!passwordMatched){
        throw new ApiError(401, "Incorrect password");
    }
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    res
    .status(200)
    .cookie("accessToken",accessToken, options)
    .cookie("refreshToken",refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser,
                accessToken,
                refreshToken
            },
            "User logged In Successfully."
        )
    );
})

const logoutUser = asyncHandler(async (req, res) => {
    //console.log(req.user);
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: ""
            }
        },
        {
            new: true
        }
    );

    res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));

});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const token = req.cookies.refreshToken || req.body?.refreshToken;
    console.log(token);
    if(!token){
        throw new ApiError(401, "unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    console.log(decodedToken)
    const user = await User.findById(decodedToken?._id);
    console.log(user)
    if(!user){
        throw new ApiError(401, "Incorrect Refresh Token");
    }

    if(token !== user.refreshToken){
        throw new ApiError(401, "Refresh Token is expired or used");
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

    res
    .status(200)
    .cookie("accessToken",accessToken, options)
    .cookie("refreshToken",refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                accessToken,
                refreshToken
            },
            "Access Token refreshed"
        )
    );

    
})

export {registerUser, loginUser, logoutUser, refreshAccessToken};