import { app } from "./app.js";
import connectdb from "./db/connectDb.js";








connectdb()
.then(()=>{
    process.on('error',(error)=>{
        console.log("Uncaught error occures in node application :- ", error);
        process.exit(1);
    });
    app.listen(process.env.PORT || 3000, ()=>{
        console.log(`Node.js Server is listening on PORT:${process.env.PORT}`);
    })
})
.catch((error)=>{
    console.log("Error while connecting to db(index.js) :-  ", error);
});