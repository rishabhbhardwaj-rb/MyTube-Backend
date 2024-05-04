import { Router } from "express";
import { changeCurrentPassword, getCurrentUser, getUserChannelProfile, getUserWatchHistory, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateAvatarImage, updateCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }]),
    registerUser);

router.route("/login").post(loginUser);

//secure routes

router.route("/logout").post(authenticateUser, logoutUser);

router.route("/refresh-token").post(refreshAccessToken);

router.route("/change-password").post(authenticateUser, changeCurrentPassword);

router.route("/current-user").get(authenticateUser, getCurrentUser);

router.route("/update-account-info").patch(authenticateUser, updateAccountDetails);

router.route("/update-avatar-image").patch(authenticateUser, upload.single("avatar"),updateAvatarImage);

router.route("/update-cover-image").patch(authenticateUser, upload.single("coverImage"),updateCoverImage);

router.route("/channel/:username").get(authenticateUser, getUserChannelProfile);

router.route("/watchHistory").get(authenticateUser, getUserWatchHistory);

export default router;