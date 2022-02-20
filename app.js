require('dotenv').config()
const express = require('express')
const bodyParser = require("body-parser")
const ejs = require("ejs")
const app = express()
const port = process.env.PORT || 3000
const mongoose = require('mongoose');
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
// const md5 = require("md5")
// const encrypt = require("mongoose-encryption")
const session = require("express-session")
const passport = require("passport")
const passportLocalMongoose = require("passport-local-mongoose")

app.use(express.static("public"))
app.set("view engine", "ejs")
app.use(bodyParser.urlencoded({ extended: true }))

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://localhost:27017/userDB', { useNewUrlParser: true });

const userSchema = new mongoose.Schema({
  username: String,
  password: String
})

userSchema.plugin(passportLocalMongoose)

// var secret = process.env.SECRET;
// userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password']  });

const User = new mongoose.model("User", userSchema)

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get('/', (req, res) => {
  res.render("home")
})

app.get('/login', (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect("/secrets")
  } else {
    res.render("login")
  }
})

app.get('/register', (req, res) => {
  res.render("register")
})

app.get("/secrets", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("secrets")
  } else {
    res.redirect("/login")
  }
})

app.post("/register", (req, res) => {
  User.register(new User({ username: req.body.username }), req.body.password, function (err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register")
    } else {
      passport.authenticate('local')(req, res, function () {
        res.redirect('/secrets');
      });
    }
  });
})

app.post("/login", (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  })

  req.login(user, (err) => {
    if (err) {
      console.log(err)
    } else {
      passport.authenticate('local')(req, res, function () {
        res.redirect('/secrets');
      });
    }
  })
})

app.get("/logout", (req, res) => {
  req.logout()
  res.redirect("/")
})


/*
app.post('/register', (req, res) => {
  
  bcrypt.hash(req.body.password, saltRounds, function (err, hash) { // Takes password and gives back as hash.
    const user = new User({
      username: req.body.username,
      password: hash
    })

    user.save((err) => {
      if (!err) {
        console.log("Successfully added to database")
        res.render("secrets")
      } else {
        console.log("Failed to add to database.")
      }
    });
  })
  
})

app.post('/login', (req, res) => {

  const username = req.body.username
  const password = req.body.password

  User.findOne({ username: username }, (err, result) => {
    if (err) {
      console.log("An error occurred")
      res.render("login")
    } else {
      if (result) { // null check
        bcrypt.compare(password, result.password, function(err, result) {
          if (result == true) {
            console.log("Successfully logged in")
            res.render("secrets")
          } else {
            console.log("Wrong password")
            res.render("login")
          }
        });
      } else {
        console.log("No such a user")
        res.render("login")
      }
    }
  })
  
})
*/

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})