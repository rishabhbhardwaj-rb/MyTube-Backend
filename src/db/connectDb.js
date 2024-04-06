import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectdb = async () => {
    try {
        const connectionResponse = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log("Database Connected Successfully at Host:- ",connectionResponse.connection.host);


    } catch (error) {
        console.log("Error in connecting to Mongodb --> ",error);
        process.exit(1);
    }
}

export default connectdb;