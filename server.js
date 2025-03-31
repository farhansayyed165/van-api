// import all the stuff
require("dotenv").config();
const express = require("express");
const app = express();
const errorHandler = require("./middleware/errorHandler")
const validateToken = require("./middleware/validateToken")
const { pool } = require("./queries");
const cookieParser = require('cookie-parser')
const multer = require("multer")
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
const { getImageUrl } = require("./config/awsConfig")
const Razorpay = require('razorpay');
const crypto = require("crypto")
// https://api.razorpay.com/v1/orders


const cors = require("cors");

// app.set('Access-Control-Expose-Headers', 'field')

app.use(cookieParser())

app.use(express.json())

const corsConfig = {
    credentials: true,
    origin: true,
};

app.use(cors(corsConfig));

app.use(errorHandler);

app.use(express.urlencoded({
    extended: true,
}));

app.get("/", (req, res) => {
    res.json({ message: "Node js cool" });
});

app.get("/file", upload.single("image"), async (req, res) => {
    console.log(req.body)
    console.log(req.file)
    res.send(req.body)
})

app.use("/api/", require("./routes/vansRoute"))

app.get("/checkToken", validateToken, (req, res) => {
    // const user = req.user
    // console.log(user)
    res.status(200).json(true)
})
app.post("/api/test", (req,res)=>{
    res.json(req.body)
})
app.use("/api/", require("./routes/userRoute"))

app.get("/api/refresh", require("./controller/refreshTokenController"))

app.post("/api/order", async (req, res) => {
    try {
        var razorpay = new Razorpay({
            key_id: 'rzp_test_U6u6MtX7VIBx9w',
            key_secret: 'TAKFXAIBZJWYMar4n97yumZd',
        });
        const options = req.body;
        const order = await razorpay.orders.create(options);

        if (!order) {
            return res.status(400).send("something went wrong");
        }
        res.json(order);
    } catch (error) {
        console.log(error)
        res.status(500).send(error);
    }

});

const calculateReturnTimestamp = (rentalTimestamp, duration) => {
    const rentalDate = new Date(rentalTimestamp); // Convert to Date object
    let returnDate = new Date(rentalDate); // Clone the rental date

    if (duration === 1) {
        if (rentalDate.getHours() < 12) {
            // Before 12 PM → Return same day before 8 PM
            returnDate.setHours(20, 0, 0, 0); // Set to 8 PM
        } else {
            // After 12 PM → Return next day before 11 AM
            returnDate.setDate(returnDate.getDate() + 1);
            returnDate.setHours(11, 0, 0, 0); // Set to 11 AM next day
        }
    } else {
        // More than 1 day → Return that many days later before 8 PM
        returnDate.setDate(returnDate.getDate() + duration);
        returnDate.setHours(20, 0, 0, 0); // Set to 8 PM
    }

    return returnDate.toISOString(); // Convert to string format for storage
};


app.post("/api/verify", async (req, res) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    const sha = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET);
    // order_id + "|" + razorpay_payment_id, secret
    sha.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = sha.digest("hex");
    if (digest !== razorpay_signature) {
        console.log("NOT LEGIT")
        return res.status(400).json({ "msg": "Transaction is not legit!" });
    }
    else{
        console.log("LEGITTTT")
    }

    const { van, duration, userid } = req.body;
    if (!van || !duration || !userid) {
        res.status(400).json("no van details");
    }
    
    const rentalTimestamp = new Date().toISOString();
    const returnTimeStamp = calculateReturnTimestamp(rentalTimestamp, duration);
    // ordertimestamp, customerid, vanid, hostid, duration, payid, orderid, order_signature, returndatetime 
    const query = `
    INSERT INTO transaction (ordertimestamp, customerid, vanid, hostid, duration, details, payid, orderid, order_signature, returndatetime)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *;`;

    const values = [rentalTimestamp, userid, van.vanid, van.userid, duration, "lmao", razorpay_payment_id, razorpay_order_id, razorpay_signature, returnTimeStamp];
    console.log(values)
    const client = await pool.connect();
    try {     
        const response = await client.query(query, values);
        client.release();
        res.json({
            msg: "success",
            response
        });
    } catch (error) {
        client.release()
        console.log(error)
        res.status(400);
    }
})

app.use((req, res) => {
    res.status(404).send("Not Found");
});

app.listen(3000, () => {
    console.log("Listening to port 3000");
})