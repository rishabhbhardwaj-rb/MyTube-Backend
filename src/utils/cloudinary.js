import {v2 as cloudinary} from 'cloudinary';
import fs from 'node:fs';
          
cloudinary.config({ 
  cloud_name:  process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});


const uploadCloudinary = async (localFilePath) => {
    
    try {
        if(!localFilePath)return null;
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: 'auto'
        });
        //console.log("file is successfully uploaded on cloudinary \n", response);
        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        console.log("Error occured while uploading file on cloudinary!!!! \n",error);
        fs.unlinkSync(localFilePath);
        return null;
    }

    
}

const deleteCloudinary = async (resourceId) => {
    try{
        if(!resourceId)return null;
        //http://res.cloudinary.com/djsklfvle/image/upload/v1714587352/m9dclp9m1napbokldbk6.jpg
        const splitPath = resourceId.split('/');
        const resourceName = splitPath[splitPath.length -1].split('.')[0];
        const response = await cloudinary.uploader.destroy(
            resourceName, 
            { type: 'upload', resource_type: 'image' }
        );
        
        

        return response;
    } catch(error){
        console.log("Error occured while deleting file from cloudinary!!!! \n", error);
        return null;
    }
}

export {uploadCloudinary,
    deleteCloudinary

};

