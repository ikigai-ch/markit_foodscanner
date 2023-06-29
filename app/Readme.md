
# Mark It: A Pantry Organiser and Expiry Date Tracker

## Application Features

* An unregistered user can create an account, allowing them to log in to the application and use its features.
* A registered user can log into the application and take advantage of the following functionalities:

 1. Add a product to their pantry by scanning its barcode. The scanner functionality accepts only EAN-13 (European Article Number) barcodes.
 2. Add a product's quantity and expiration date.
 3. Add a product to their pantry manually by hitting a magnifying glass icon. This time, any type of barcode can be added.
 4. Modify/edit the already added product. For barcodes that are pulled from the Open Food Facts API, the user can modify only the product's name, quantity, and expiration date. For barcodes beyond the Open Food Facts database, after adding a product to the pantry, the user would see "No Product Name" and "No image available." These details can be changed by editing a product. For example, the end-user could add a desired name along with the picture URL. Note that once the picture URL has been added, the end-user would not see the option to modify it anymore via front-end. It is also worth noting that products that were not added via the aforementioned API will have 'N/A' in the following fields: 'Eco Score', 'CO² Per 100g', 'Vegan', 'Has Palm Oil'.
 5. Delete the already added product.
 6. View more information about the product, such as its eco score, CO² Per 100g, whether it is vegan or not, and whether it contains palm oil or not."

## Main App Code Location

markIt/app

## Prerequisites to launch the app

a) Install the following modules (packages)

* npm install esm --save
* npm install express-validator

b) In case of any initial errors when launching the app, delete the 'markit.db' file in the app/data folder and run the 'npm start' command again. This will recreate the database and all the corresponding tables.

## App launching

npm start

## Test User Credentials

You can use the already existing user for test purposes. Note: This user will not be available if you decided to delete the 'markit.db' file prior to launching the application.

* Username: Testuser
* Password: Testuser23!

## Database Modifications (Adding, modifying tables):

* delete the SQLite database file markit.db
* edit 001-initial-schema.sql in app/migrations
* launch the app in the console: npm start

## Open DB file and query tables:

$ sqlite3
SQLite version X.XX.X YYYY-MM-DD HH:MM:SS
Enter ".help" for usage hints.
Connected to a transient in-memory database.
Use ".open FILENAME" to reopen on a persistent database.
sqlite> .open /data/markit.db

