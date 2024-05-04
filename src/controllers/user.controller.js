import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from "../models/user.model.js"
import { deleteCloudinary, uploadCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

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

    
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {currentPassword, newPassword} = req.body;
    
    const user = await User.findById(req.user?._id);
   
    const passwordMatched = await user.isPasswordCorrect(currentPassword);
    
    if(!passwordMatched){
        throw new ApiError(400, "Incorrect password");
    }
    user.password = newPassword;
    await user.save({validateBeforeSave: false});
    res
    .status(200)
    .json(
        new ApiResponse(200, {}, "Password updated successfully")
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
    res
    .status(200)
    .json(
        new ApiResponse(200, 
            req.user,
            "current user information sent successfully")
    )
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullName, email} = req.body;
    if(!(fullName && email)){
        throw new ApiError(400, "Information is missing");
    }
    const user = await User.findByIdAndUpdate(req.user?._id, 
        {
            $set: {
                fullName, 
                email
            }
        },
        {new: true})
        .select("-password");
    if(!user){
        throw new ApiError(400, "Invalid user credentials");
    }

    res
    .status(200)
    .json(
        new ApiResponse(200, user, "User information updated successfully")
    );
    
});

const updateAvatarImage = asyncHandler(async (req, res) => {
    const avatarImageLocalPath = req.file?.path;
    if(!avatarImageLocalPath){
        throw new ApiError(400, "avatar image is missing");
    }
    const avatarImage = await uploadCloudinary(avatarImageLocalPath);
    if(!avatarImage){
        throw new ApiError(500, "Issue in uploading image to cloudinary");
    }
    const user = await User.findByIdAndUpdate(req.user?._id, 
        {
            $set: {
                avatar: avatarImage.url
            }
        },
        {new : true})
        .select("-password");

    const deletedFile = await deleteCloudinary(req.user?.avatar);
    if(!deletedFile){
        throw new ApiError(500, "Error in deleting file from cloudinary");
    }
    console.log(deletedFile);
    
    res
    .status(200)
    .json(
        new ApiResponse(200, user, "avatar image changed successfully")
    );
});

const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;
    if(!coverImageLocalPath){
        throw new ApiError(400, "cover image is missing");
    }
    const coverImage = await uploadCloudinary(coverImageLocalPath);
    if(!coverImage){
        throw new ApiError(500, "Issue in uploading image to cloudinary");
    }
    const user = await User.findByIdAndUpdate(req.user?._id, 
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new : true})
        .select("-password");

    const deletedFileRes = await deleteCloudinary(req.user?.coverImage);

    console.log(deletedFileRes);
    
    res
    .status(200)
    .json(
        new ApiResponse(200, user, "cover image changed successfully")
    );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const {username} = req.params;
    if(!username?.trim()){
        throw ApiError(400, "username is missing");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount: {
                    $size : "$subscribers"
                },
                channelSubscribedToCount:{
                    $size : "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                username: 1,
                email: 1,
                subscribersCount: 1,
                channelSubscribedToCount: 1,
                avatar: 1,
                coverImage: 1,
                isSubscribed: 1,
                fullName: 1
            }
        }

    ]);

    if(!channel?.length){
        throw new ApiError(404, "channel doesn't exist");
    }
    //console.log(channel[0]);
    res
    .status(200)
    .json(
        new ApiResponse(
            200,
            channel[0],
            "Channel information fetched successfully"
        )
    );
});

const getUserWatchHistory = asyncHandler(async (req, res) => {
    console.log(req.user._id);
    const user = await User.aggregate([
        {
            $match: {
                _id : req.user._id
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "_id",
                foreignField: "owner",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup:{
                            from: "users",
                            localField:"owner",
                            foreignField: "_id",
                            as:"owner"
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first : "$owner"
                            }
                            
                        }
                    }
                ]
            }
        }
    ]);
    if(!user?.length){
        throw new ApiError(400, "user doesnot exist");
    }
    console.log(user);
    res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "watchHistory fetched successfully"
        )
    )

});
export {registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatarImage,
    updateCoverImage,
    getUserChannelProfile,
    getUserWatchHistory
};