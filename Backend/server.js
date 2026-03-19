require("dotenv").config()
const app = require("./api/app")
const connectToDB = require("./api/config/database")

connectToDB()

app.get("/", (req,res)=>{
    res.send("Server started");
})
// app.listen(3000, () => {
//     console.log("Server is running on port 3000")
// })