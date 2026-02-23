if (process.env.NODE_ENV != "production") {
    require('dotenv').config()
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

// MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";
const dbUrl = process.env.ATLASDB_URL;

// Validate required environment variables
if (!dbUrl) {
    console.error("ERROR: ATLASDB_URL environment variable is not configured.");
    console.error("Please create a .env file with your MongoDB connection URL.");
    console.error("Refer to .env.example for the required environment variables.");
    process.exit(1);
}

main().then(() => {
    console.log("connected to db");
}).catch((err) => {
    console.error("❌ MongoDB Connection Error");
    console.error("----------------------------------------------");
    console.error("Could not connect to MongoDB Atlas");
    console.error("");
    console.error("SOLUTION: Whitelist your IP address");
    console.error("1. Go to: https://cloud.mongodb.com/");
    console.error("2. Navigate to: Network Access > IP Whitelist");
    console.error("3. Click 'Add IP Address'");
    console.error("4. Select 'Allow Access from Anywhere' OR add your specific IP");
    console.error("5. Restart the application");
    console.error("");
    console.error("Error details:", err.message);
    console.error("----------------------------------------------");
    process.exit(1);
});

async function main() {
    await mongoose.connect(dbUrl);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: process.env.SECRET || "placeholder-secret",
    },
    touchAfter: 24 * 3600,
});

store.on("error", () => {
    console.log("ERROR in MONGO SESSION STORE", err);
})

const sessionOption = {
    store:store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly:true,
    },
};

// app.get("/", (req, res) => {
//     res.send("i m root");
// });

app.use(session(sessionOption));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.warning = req.flash("warning");
    res.locals.info = req.flash("info");
    res.locals.currUser = req.user || null;
    next();
});

// Landing / Home page
app.get('/', (req, res) => {
    res.render('home');
});
// app.get("/demouser", async (req, res) => {
//     let fakeUser = new User({
//         email: "student@gmail.com",
//         username: "delta-student"
//     });

//     let registeredUser = await User.register(fakeUser, "helloworld");
//     res.send(registeredUser);
// });

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);


// app.get("/testlisting", async (req, res) => {
//     let samplelisting = new Listing({
//         title: "my new villa",
//         description: "by the beach",
//         price: 1200,
//         location: "Calangote, Goa",
//         country: "India"
//     });
//     await samplelisting.save()
//     console.log("sample was saved");
//     res.send("succesfully tested");
// });

app.all("*", (req, res, next) => {
    next(new ExpressError(404, "page not found"));
});

app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something went wrong!" } = err;
    res.status(statusCode).render("error.ejs",{message});
    // res.status(statusCode).send(message);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`server is listening at ${PORT} port`);
});