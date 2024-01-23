const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser")
const crypto = require('crypto');
const shuffle = require('shuffle-array');
const mysql = require("mysql2");
const fs = require("fs");
const ejs = require("ejs"); // Importa el módulo EJS

const app = express();
const port = 3000;

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
}));

// Configurar el motor de plantillas EJS
app.set("view engine", "ejs");

// Configura la ruta dels arxius estatics
app.use(express.static(__dirname + '/public/'));

// Configura el middleware entre els formularis i l'aplicacio
app.use(bodyParser.urlencoded({ extended: true}));
app.use(bodyParser.json());

// Configuración de la conexión a la base de datos
const db = mysql.createConnection({
  host: "192.168.1.255",
  port: "3306",
  user: "angel",
  password: "angel1234",
  database: "M16_angel"
});
/*
const db = mysql.createConnection({
  host: "127.0.0.1",
  port: "3306",
  user: "root",
  password: "toorPassword2",
  database: "m16"
});
*/
db.connect((err) => {
  if (err) throw err;
  console.log('Conectado a MySQL');
});

// Ruta para la página principal Crida a la nostra pàgina principal!!!
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// Ruta per afegir nou usuari
app.get("/logIn", (req, res) => {
  res.sendFile(__dirname + "/public/logIn.html");
});

// Ruta per iniciar sessio
app.get("/singIn", (req, res) => {
  res.sendFile(__dirname + "/public/singIn.html");
});

app.get("/addQ", (req, res) => {
  res.sendFile(__dirname + "/public/addQuestions.html")
});

// Resposta a Formularis
app.post("/add", (req, res) => {
  const {nom, cognom1, cognom2, correu, nomUsuari, contrasenya, contrasenya2} = req.body;
  if (contrasenya != contrasenya2) {
    return res.status(400).send("Contrasenyas no coincideixen")
  }
  const hashPass = crypto.createHash('sha256').update(contrasenya).digest('hex');

  db.query('INSERT INTO usuaris (nom, cognom1, cognom2, correu, nomUsuari, contrasenya) VALUES (?, ?, ?, ?, ?, ?)',
  [nom, cognom1, cognom2, correu, nomUsuari, hashPass],
  (err, result) => {
    if (err) throw err;
    req.session.username = nomUsuari;
    res.render("forms");
  });
});

app.post('/auth', (req, res) => {
  const { nomUsuari, contrasenya } = req.body;
  db.query('SELECT * FROM usuaris WHERE nomUsuari = ?',
  [nomUsuari],
  (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      const userDB = result[0];
      const hasPass = crypto.createHash('sha256').update(contrasenya).digest('hex');
      if (hasPass === userDB.contrasenya) {

        db.query('SELECT * FROM forms', (err, formsResult) =>{
          if (err) throw err;
          const forms = formsResult;
          req.session.username = nomUsuari;
          res.render('forms', { forms });
        });
        //res.render("moduls");
      } else {
        res.render('alert', {message : 'Contrasenya incorrecta', link : ''})
        //res.status(401).send('Contrasenya incorrecta');
      }
    } else {
      res.render('alert', {message : 'Usuari no trobat', link : ''})
      //res.status(401).send('Usuari no trobat');
    }
  });
});

app.get("/forms", (req, res) => {
  db.query('SELECT * FROM forms', (err, formsResult) =>{
    if (err) throw err;
    const forms = formsResult;

    res.render('forms', { forms });
  });
});

app.get('/questions/:formId', (req, res) => {
  const formId = req.params.formId;

  // Perform a query to get questions related to the specified formId
  db.query('SELECT * FROM questions WHERE formId = ?', [formId], (err, queryResult) => {
    if (err) throw err;
    const question = queryResult[0];
    const resultats = shuffle([
      queryResult[0].correctOption,
      queryResult[0].wrongOption1,
      queryResult[0].wrongOption2
    ]);
    
    res.render('questions', { question, resultats });
  });
});

app.post('/check-answer', (req, res) => {
  const questionId = req.body.questionId;
  const optionId = req.body.optionId;
  
  // Perform a query to get the correctOption for the specified questionId
  db.query('SELECT correctOption FROM questions WHERE id = ?', [questionId], (err, result) => {
    if (err) throw err;
    
    const correctOption = result[0].correctOption;
    
    if (optionId === correctOption) {
      // Correct answer
      const username = req.session.username;
      const puntsIncrement = 10;
      db.query('UPDATE usuaris SET punts = punts + ? WHERE nomUsuari = ?', [puntsIncrement, username], (err, updRes) => {
        if (err) throw err;
        res.render('alert', {message : 'Correcte', link : 'forms'})
      });
    } else {
      // Incorrect answer
      res.render('alert', {message : 'Incorrecte', link : 'forms'})
    }
  });
});

app.post("/addQuestion", (req, res) => {
  const questio = req.body.question;
  const answer1 = req.body.option1;
  const answer2 = req.body.option2;
  const answer3 = req.body.option3;
  
  db.query('INSERT INTO forms (name) SELECT MAX(id)+1 FROM forms', (err, result) => {
    if (err) throw err;
    const newFormId = result.insertId;
    db.query('INSERT INTO questions (formId, title, correctOption, wrongOption1, wrongOption2) VALUES (?, ?, ?, ?, ?)', [ newFormId, questio, answer1, answer2, answer3 ], (err, insRes) => {
      if (err) throw err;
      res.render('alert', {message: 'Questio Afegida', link : 'addQ'})
    });
  });
});

app.listen(port, () => {
  console.log(`Servidor iniciado en http://192.168.1.225:${port}`);
});
