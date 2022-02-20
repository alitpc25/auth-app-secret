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

const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate")

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
  password: String,
  googleId: String,
  secret: String
})

userSchema.plugin(passportLocalMongoose)
userSchema.plugin(findOrCreate)

// var secret = process.env.SECRET;
// userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password']  });

const User = new mongoose.model("User", userSchema)

passport.use(User.createStrategy());
passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username, name: user.displayName });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
)); // should come after serializing and deserializing the user

app.get('/', (req, res) => {
  res.render("home")
})

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

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
    User.find({"secret": { $exists: true }}, (err, foundUsers) => {
      if (err) {
        console.log(err)
      } else {
        if (foundUsers) {
          res.render("secrets", {usersWithSecrets: foundUsers})
        }
      }
    })
  } else {
    res.redirect("/login")
  }
})

app.get("/submit", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("submit")
  } else {
    res.redirect("/login")
  }
})

app.post("/submit", (req, res) => {
  const submittedSecret = req.body.secret
  User.findById(req.user.id, (err, foundUser) => {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret
        foundUser.save(function() {
          res.redirect("/secrets")
        }) // After saving, calls this callback function.
      } else {

      }
    } 
  })
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