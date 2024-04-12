const asyncHandler = (requestHandler) => async (req, res, next) => {
    try {
        await requestHandler(req,res,next);
        
    } catch (error) {
        next(error);
        //console.log(error);
        // res.status(error.statusCode).json({
        //     "message":error.message,
        //     "body":error
        // });
    }
}

export {asyncHandler};