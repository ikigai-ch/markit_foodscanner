// Import necessary modules
import express from "express"; // web framework
import sqlite3 from "sqlite3"; // SQLite database
import { open } from "sqlite"; // SQLite library
import path from "path"; // path library
import bcrypt from "bcrypt"; // library for password hashing
import session from "express-session"; // middleware for session management
import axios from "axios"; // library for making HTTP requests

// Increase verbosity of SQLite debugging output
sqlite3.verbose()

// Create express app and set server configuration
const app = express();
const port = 8082;
const SALT_ROUNDS = 10; // number of salt rounds for bcrypt hashing

// Import express-validator module for request validation
const { check, validationResult } = require('express-validator');

// Configure express app with middleware
app.set("view engine", "ejs"); // use ejs as template engine
app.set("views", path.join(__dirname, "views")); // set views directory
app.use(express.static(path.join(__dirname, "public"))); // set static files directory
app.use(express.urlencoded({ extended: false })); // use body-parser middleware to parse request bodies

// Use express-session middleware to manage sessions
app.use(
    session({
        secret: "AaMrS2023",
        resave: false,
        saveUninitialized: true
    })
);

// Middleware to test if user is authenticated
const isAuth = (req, res, next) => {
    if (req.session.isAuth) {
        next()
    } else {
        res.redirect("/login");
    }
};

// Open a database connection to the "markit.db" SQLite database

const dbPromise = open({
    filename: "data/markit.db",
    driver: sqlite3.Database,
});

// Handle GET requests for User Registration
app.get("/", async (req, res) => {
    res.render("index");
});

// Handle POST requests for User Registration + Validation
app.post("/",
    [
        check("username", "Username must be between 3 and 30 characters long")
            .exists()
            .isLength({ min: 3, max: 30 })
            .custom(async (username, { req }) => {
                const db = await dbPromise;
                const sql = "SELECT username FROM User WHERE username = ?";
                const usernameExist = await db.get(sql, [username]);
                if (usernameExist && usernameExist.username === username) {
                    throw new Error("That username has been already taken. Try another one.");
                }
            }),
        check("email", "Invalid email")
            .isEmail()
            .normalizeEmail()
            .custom(async (email, { req }) => {
                const db = await dbPromise;
                const sql = "SELECT email FROM User WHERE email = ?";
                const emailExist = await db.get(sql, [email]);
                if (emailExist && emailExist.email === email) {
                    throw new Error("The email you entered is already registered.");
                }
            }),

        check("passwordRepeat")
            .trim()
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}\[\]\\|:;"'<>,.?/])[A-Za-z\d!@#$%^&*()_+\-={}\[\]\\|:;"' <>,.? /]{8,}$/
            )
            .withMessage("Password must be at least 8 characters long and contain at least: one uppercase letter, one lowercase letter, and one number, and one special character")
            // .withMessage("Password")
            .custom(async (confirmPassword, { req }) => {
                const password = req.body.password
                if (password !== confirmPassword) {
                    throw new Error("Password do not match")
                }
            })
    ],
    async (req, res) => {
        const errors = validationResult(req);
        const db = await dbPromise;
        const { username, password, email } = req.body;
        if (!errors.isEmpty()) {
            const alert = errors.array()
            res.render("index", {
                alert
            })
        } else {

            const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
            await db.run(
                "INSERT INTO User (username, password, email) VALUES (?, ?, ?)",
                username,
                passwordHash,
                email
            )
        };
        res.redirect("/login");
        console.log(errors);
    });

// Handle GET requests for User Login
app.get("/login", async (req, res) => {
    res.render("login");
});

// Handle POST requests for User Login + Validation

app.post("/login", [
    // Validate that the username field is not empty
    check("username").notEmpty().withMessage("Username is required"),
    // Validate that the password field is not empty
    check("password").notEmpty().withMessage("Password is required"),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // If there are validation errors, render the login page with an alert
        const alert = errors.array()
        res.render("login", {
            alert
        })
    } else {
        // If there are no validation errors, try to log in the user
        const db = await dbPromise;
        const username = req.body.username;
        const password = req.body.password;
        const getCredentials = "SELECT username, password FROM User WHERE username = ?";
        const userExist = await db.get(getCredentials, [req.body.username]);
        if (!userExist) {
            // If the username does not exist in the database, render the login page with an alert
            const alert = [{ msg: "Invalid username or password" }];
            res.render("login", {
                alert
            });
        } else {
            const isMatch = await bcrypt.compare(password, userExist.password);
            if (isMatch) {
                // If the password matches, set the user as authenticated and redirect to the dashboard
                req.session.isAuth = true;
                req.session.isAuth = true;
                req.session.user = userExist.username;
                console.log(req.session);
                console.log(req.sessionID);
                res.redirect("dashboard");
            } else {
                // If the password does not match, render the login page with an alert
                const alert = [{ msg: "Invalid username or password" }];
                res.render("login", {
                    alert
                });
            }
        }
    }
});


// Handle GET requests for User Dashboard
app.get("/dashboard", isAuth, async (req, res) => {
    const db = await dbPromise;
    const sql = "select * from Products where user_name = ?";
    const rows = await db.all(sql, [req.session.user]);
    const userSQL = "SELECT username FROM User WHERE username = ?"
    const user = await db.get(userSQL, [req.session.user])
    console.log(rows)
    console.log(user);
    res.render("dashboard", { data: rows, user });
});

// Logout

app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) throw err;
        res.redirect("/login");
    })
});

//GET product page
app.get("/product_page", async (req, res) => {
    const db = await dbPromise;
    const sql = "select * from Products where id = ?";
    const rows = await db.all(sql, [req.query.id]);
    res.render("product_page", { data: rows[0] });
});

// Handle GET requests for User Login
app.get("/add_product", async (req, res) => {
    res.render("add_product");
});

// POST | insert new product given barcode number
// this will be called by a form to manually enter the barcode id or from the camera scanner
app.post("/add_product", isAuth, async (req, res) => {
    const db = await dbPromise;
    // get barcode from form
    const barcode = req.body.barcode;
    const quantity = req.body.quantity;
    const expiration_date = req.body.expiration_date;
    // TODO add validation code here (should be a function that we call and pass the id)

    // call the Open Food Facts API to get product information
    axios.get(`https://world.openfoodfacts.org/api/v0/product/${barcode}`)
        .then(data => {
            return data.data.product;
        })
        .then(product => {
            // console.log(product.product_name)
            const user_name = req.session.user;

            // get the product name from the Open Food Facts API or set it to "No Product Name"
            let product_name = "No Product Name";
            if (product) {

                product_name = product.product_name !== undefined ? product.product_name :
                    product.product_name_en !== undefined ? product.product_name_en :
                        product.product_name_de !== undefined ? product.product_name_de :
                            product.product_name_it !== undefined ? product.product_name_it :
                                product.product_name_pl !== undefined ? product.product_name_pl :
                                    product.product_name_fr !== undefined ? product.product_name_fr :
                                        product.product_name_lt !== undefined ? product.product_name_lt :
                                            product.product_name_ru !== undefined ? product.product_name_ru :
                                                "No product name";
            } else if (barcode === undefined) {
                product_name = "My product (Outside of Open Food Facts collaborative database)"
            }
            console.log(product_name);

            // get the ecoscore grade from the Open Food Facts API or set it to "No ecoscore"
            let ecoscore_grade;
            if (product) {
                ecoscore_grade = product.ecoscore_grade !== undefined ? product.ecoscore_grade : "No ecoscore";
            } else if (ecoscore_grade === undefined) {
                ecoscore_grade = "No information"
            }
            console.log(ecoscore_grade);

            // get the CO2 data from the Open Food Facts API or set it to "No CO2 score"
            let co2_data;
            if (product) {
                co2_data = product.ecoscore_data !== undefined && product.ecoscore_data.agribalyse !== undefined ? product.ecoscore_data.agribalyse.co2_total : "No co2 score";
            } else if (co2_data === undefined) {
                co2_data = "No information"
            }
            console.log(co2_data);

            // get the label tags from the Open Food Facts API or set it to "No Label Tag (Outside of Open Food Facts collaborative database)"
            let labels_tag = product ? product.labels_tags || [] : "No Label Tag (Outside of Open Food Facts collaborative database)";
            console.log(labels_tag);

            // get the image URL from the Open Food Facts API or set it to "No image url"
            let image_url;

            if (product) {
                image_url = product.image_url !== undefined ? product.image_url : "No image url";
            } else if (image_url === undefined) {
                image_url = "Image is not available (Outside of Open Food Facts collaborative database)"
            }
            console.log(image_url);
            // check if product has palm oil
            let palm_oil;
            if (product) {
                palm_oil = labels_tag.includes("en:no-palm-oil") === false ? 1 : 0
            } else if (palm_oil === undefined) {
                palm_oil = "No information"
            }
            console.log(palm_oil);

            // check if product is vegan
            let vegan;
            if (product) {
                vegan = labels_tag.includes("en:vegan") === true ? 1 : 0
            } else if (vegan === undefined) {
                vegan = "No information"
            }
            console.log(vegan);

            // query to upsert a product based on the barcode AND the expiration date of the product
            const sql = `INSERT OR REPLACE INTO Products (id, user_name, barcode, product_name, image_url, eco_score, expiration_date, co2, has_palm_oil, is_vegan, quantity)
                    VALUES(
                      (SELECT id FROM Products WHERE barcode = '${barcode}' AND expiration_date = '${expiration_date}'),
                       '${user_name}',
                       '${barcode}',
                       '${product_name}',
                       '${image_url}',
                       '${ecoscore_grade}',
                       '${expiration_date}',
                       '${co2_data}',
                       '${palm_oil}',
                       '${vegan}',
                       COALESCE((SELECT quantity FROM Products WHERE barcode = '${barcode}' AND expiration_date = '${expiration_date}'), 0) + ${quantity}
                    );
                   `
            db.run(sql)
            res.redirect("/dashboard")
        })
        .catch(err => console.log(err));
});

// Handle POST requests for Deleting an Exisintg Product from a Pantry (Dashboard)
app.post("/delete_product/:id", isAuth, async (req, res) => {
    const db = await dbPromise;
    const id = req.params.id;
    const sql = "DELETE FROM Products WHERE ID = ?";
    await db.run(sql, id);
    res.redirect("/dashboard");
});

// Update a product in Your Pantry
app.post('/update/:id', isAuth, async (req, res) => {
    const db = await dbPromise;
    const id = req.params.id;
    const quantity = parseInt(req.body.quantity);
    const productName = req.body.product_name;
    const expiration_date = req.body.expiration_date;
    const image = req.body.image_url;
    console.log(image);

    let sql;

    // If an image URL is provided, update the image URL in the database
    if (image && image.trim() !== "") {
        sql = "UPDATE Products SET product_name = ?, quantity = ?, expiration_date = ?, image_url = ? WHERE id = ?";
        db.run(sql, [productName, quantity, expiration_date, image, id], (err) => {
            if (err) {
                return console.error(err.message);
            }
        });
    } else {
        // Otherwise, update the product without the image URL
        sql = "UPDATE Products SET product_name = ?, quantity = ?, expiration_date = ? WHERE id = ?";
        db.run(sql, [productName, quantity, expiration_date, id], (err) => {
            if (err) {
                return console.error(err.message);
            }
        });
    }

    console.log(sql);
    console.log(`Your product "${productName}" has been successfully updated`);

    res.redirect("/dashboard");
});


// Define function to set up the server and database connection
const setup = async () => {
    // Connect to database
    const db = await dbPromise;
    console.log("Successful connection to the database 'markit.db'");
    // Migrate database (run any pending migrations)
    await db.migrate();

    // Start the server
    app.listen(port, () => {
        console.log(`Server started (http://localhost:${port}/)!`);
    });

};

// Call setup function to start the server and connect to the database
setup();


