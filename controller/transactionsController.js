const asyncHandler = require("express-async-handler")
const {pool} = require("../queries")
const Razorpay = require('razorpay');


const order = asyncHandler(async (req, res) => {
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

})

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



const verify = asyncHandler(async (req, res) => {
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

module.exports = {order, verify}