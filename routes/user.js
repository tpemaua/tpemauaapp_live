var express = require("express");
var router = express.Router();
var bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
var Sms = require("totalvoice-node").Sms;
var nodemailer = require("nodemailer");
var mongoose = require("mongoose");
var LocalStorage = require("node-localstorage").LocalStorage;
var telegram = require("../routes/telegram");
const ms = require("ms");

var User = require("../models/user");
var User2 = require("../models/user");
var UserMaster = require("../models/user");

localStorage = new LocalStorage("./scratch");
const SUPORTEMAIL = process.env.SUPORTEMAIL;
const PASSEMAIL = process.env.PASSEMAIL;

router.post("/", function(req, res, next) {
  console.log("req.body.config", req.body.config);

  let conjuge = null;
  let responsable = null;
  let config = [[], [], [], [], [], [], []];

  console.log("req.body.config", req.body.config);

  if (req.body.conjuge) conjuge = mongoose.Types.ObjectId(req.body.conjuge);
  if (req.body.responsable)
    responsable = mongoose.Types.ObjectId(req.body.responsable);
  if (req.body.config != null) config = req.body.config;
  if (!req.body.lastday) req.body.lastday = new Date(2017, 0, 1, 3, 0, 0);

  console.log("config", config);

  var user = new User({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    password: bcrypt.hashSync(req.body.password, 10),
    email: req.body.email,
    congregation: mongoose.Types.ObjectId(req.body.congregation),
    circuito: mongoose.Types.ObjectId(req.body.circuito),
    mobilephone: req.body.mobilephone,
    phone: req.body.phone,
    datebirth: req.body.datebirth,
    responsable: responsable,
    conjuge: conjuge,
    sex: req.body.sex,
    privilege: req.body.privilege,
    eldermail: req.body.eldermail,
    config: config,
    released: false,
    lastday: req.body.lastday,
    role: " ",
    vezesmes: req.body.vezesmes,
    contavezes: 0,
    mesescalado: 0
  });
  user.save(function(err, result) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro9",
        error: err
      });
    }

    if (result.conjuge) {
      User2.findById(user.conjuge, function(err, user2) {
        if (err) {
          console.log(err);
        }
        if (!user2) {
          console.log("conjuge nao encontrado no cadastro");
        }

        user2.conjuge = result._id;
        user2.config = result.config;
        user2.vezesmes = result.vezesmes;
        user2.save();
      });
    }
    return res.status(201).json({
      message: "Usuário Criado",
      obj: result
    });
  });
});

router.patch("/sendpass", function(req, res, next) {
  User.findOne({ email: req.body.email }, function(err, user) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro10",
        error: err
      });
    }
    if (!user) {
      return res.status(401).json({
        title: "Email inexistente",
        error: { message: "O email não está cadastrado" }
      });
    }

    let pass = Math.floor(Math.random() * (997868 - 112568 + 1)) + 112568;

    (user.password = bcrypt.hashSync(pass.toString(), 10)),
      user.save(function(err, result) {
        if (err) {
          return res.status(500).json({
            title: "Ocorreu um erro11",
            error: err
          });
        }
        let transporter = nodemailer.createTransport({
          host: "smtp.mailgun.org",
          port: 465,
          secure: true,
          auth: {
            user: SUPORTEMAIL,
            pass: PASSEMAIL
          }
        });

        var mailOptions = {
          from: `"TPE" <${SUPORTEMAIL}>`,
          to: user.email,
          subject: "Senha nova do TPE",
          text:
            "Olá " +
            user.firstName +
            " " +
            user.lastName +
            " sua senha nova é: " +
            pass
        };

        transporter.sendMail(mailOptions, function(error, info) {
          if (error) {
            console.log(error);
          } else {
            console.log("Email enviado: " + info.response);
          }
        });

        return res.status(200).json({
          title: "Senha enviada",
          obj: { message: "Senha enviada para o email indicado" }
        });
      });
  });
});

router.post("/signin", function(req, res, next) {
  console.log("req.body.email:", req.body.email);
  User.findOne({ email: req.body.email }, function(err, user) {
    console.log("err:", err);
    console.log("user:", user);
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro12",
        error: err
      });
    }
    if (!user) {
      return res.status(401).json({
        title: "Falha no login",
        error: { message: "Credenciais inválidas" }
      });
    }
    if (!bcrypt.compareSync(req.body.password, user.password)) {
      return res.status(401).json({
        title: "Falha no login",
        error: { message: "Credenciais inválidas" }
      });
    }

    let role = null;
    if (
      user.role == "super" ||
      user.role == "pleno" ||
      user.role == "gold" ||
      user.role == "ctc"
    )
      role = user.role;

    var token = jwt.sign({ mykey: user._id, role: role }, "secret", {
      expiresIn: 3600
    });
    return res.status(200).json({
      message: "Sucesso em logar",
      token: token,
      userId: user._id,
      name: user.firstName,
      cidade: process.env.CIDADE
    });
  });
});

router.use("/:id", function(req, res, next) {
  jwt.verify(req.query.token, "secret", function(err, decoded) {
    if (err) {
      localStorage.clear();

      return res.status(401).json({
        title: "Seu tempo de login expirou",
        error: { message: "Entre novamente" },
        func: "novologin"
      });
    }
    next();
  });
});

router.get("/:id", function(req, res, next) {
  var decoded = jwt.decode(req.query.token);

  User.find({}, function(err, users) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro13",
        error: err
      });
    }

    /*     if (users._id != decoded.mykey ) {
            return res.status(401).json({
               title: 'Not Authenticated',
               error: {message: 'User do not match' },

           });
       }  */
    /*   for(let i= 0; i < users.length ; i++){
        users[i].password = " ";
        users[i].role = " ";
       } */

    let usersfilters = users.filter(f => {
      f.password = " ";

      //    if(req.params.id == '5ae7dee5734d1d133184274f'){
      //     if (f.circuito != '5a9dd91b89999500143b70d7')return false; //61
      //    }

      //    if(req.params.id == '5ae7dfb9734d1d1331842777'){
      //     if (f.circuito != '5aa985b357e93b001493b0d9')return false; //76
      //    }

      //    if(req.params.id == '5ae7dfa1734d1d1331842774'){
      //     if (f.circuito != '5aac6772fdc3730014c3785c')return false; //112
      //    }

      if (f.role != null && f.role != " ") return false;
      f.role = " ";

      return true;
    });

    return res.status(200).json({
      message: "Sucesso ao pegar lista de usuários",
      obj: usersfilters
    });
  });
});

router.get("/all/:id", function(req, res, next) {
  var decoded = jwt.decode(req.query.token);

  User.find({}, function(err, users) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro13",
        error: err
      });
    }

    /*     if (users._id != decoded.mykey ) {
            return res.status(401).json({
               title: 'Not Authenticated',
               error: {message: 'User do not match' },

           });
       }  */
    /*     for(let i= 0; i < users.length ; i++){
        users[i].password = " ";
        users[i].role = " ";
       } */

    let usersfilters = users.filter(f => {
      f.password = " ";

      if (f.role != null && f.role != " ") return false;
      f.role = " ";

      return true;
    });

    return res.status(200).json({
      message: "Sucesso ao pegar lista de usuários",
      obj: usersfilters
    });
  });
});

router.get("/useresc/:id", function(req, res, next) {
  var decoded = jwt.decode(req.query.token);

  User.find()
    .populate("congregation")
    .exec(function(err, users) {
      if (err) {
        return res.status(500).json({
          title: "Ocorreu um erro13",
          error: err
        });
      }

      /*     if (users._id != decoded.mykey ) {
            return res.status(401).json({
               title: 'Not Authenticated',
               error: {message: 'User do not match' },

           });
       }  */

      let usersfilters = users.filter(f => {
        f.password = " ";

        // if(req.params.id == '5ae7dee5734d1d133184274f'){
        //     if (f.circuito != '5a9dd91b89999500143b70d7')return false; //61
        //    }

        //    if(req.params.id == '5ae7dfb9734d1d1331842777'){
        //     if (f.circuito != '5aa985b357e93b001493b0d9')return false; //76
        //    }

        //    if(req.params.id == '5ae7dfa1734d1d1331842774'){
        //     if (f.circuito != '5aac6772fdc3730014c3785c')return false; //112
        //    }

        if (f.role != null && f.role != " ") return false;
        f.role = " ";

        return true;
      });

      return res.status(200).json({
        message: "Sucesso ao pegar lista de usuários",
        obj: usersfilters
      });
    });
});

router.get("/perfil/:id", function(req, res, next) {
  var decoded = jwt.decode(req.query.token);
  var id = req.params.id;

  User.findById(id, function(err, perfil) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro14",
        error: err
      });
    }

    if (perfil._id != decoded.mykey) {
      localStorage.clear();
      return res.status(401).json({
        title: "Não autenticado",
        error: { message: "Usuários não combinam jwt" }
      });
    }

    perfil.password = " ";
    perfil.role = " ";
    return res.status(200).json({
      message: "Acesso ao perfil com sucesso",
      obj: perfil
    });
  });
});

router.get("/perfilcomp/:id", function(req, res, next) {
  var decoded = jwt.decode(req.query.token);
  var id = req.params.id;

  User.findById(id)
    .populate("congregation", "nome")
    .populate("circuito", "nome")
    .populate("conjuge", "firstName lastName", User2)
    .populate("responsable", "firstName lastName", User2)
    .exec(function(err, perfil) {
      if (err) {
        return res.status(500).json({
          title: "Ocorreu um erro14",
          error: err
        });
      }

      if (perfil._id != decoded.mykey) {
        localStorage.clear();
        return res.status(401).json({
          title: "Não autenticado",
          error: { message: "Usuários não combinam jwt" }
        });
      }

      console.log(perfil);

      perfil.password = " ";
      perfil.role = " ";
      return res.status(200).json({
        message: "Acesso ao perfil com sucesso",
        obj: perfil
      });
    });
});

router.patch("/:id", function(req, res, next) {
  var decoded = jwt.decode(req.query.token);

  User.findById(req.params.id, function(err, user) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro2",
        error: err
      });
    }
    if (!user) {
      return res.status(500).json({
        title: "Usuário não encontrado!",
        error: { message: "Usuário não encontrado" }
      });
    }
    /*    if (user._id != decoded.mykey ) {
             return res.status(401).json({
                title: 'Not Authenticated',
                error: {message: 'User do not match' },

            });
        }  */

    user.released = req.body.released;
    user.save(function(err, result) {
      if (err) {
        return res.status(500).json({
          title: "Ocorreu um erro3",
          error: err
        });
      }
    });
  });
});

router.put("/:id", function(req, res, next) {
  // var decoded = jwt.decode(req.query.token);
  UserMaster.findById(req.params.id, function(err1, usermaster) {
    if (err1) {
      return res.status(500).json({
        title: "Ocorreu um erro1",
        error: err
      });
    }
    if (!usermaster) {
      return res.status(500).json({
        title: "Usuário não encontrado",
        error: { message: "Usuário não encontrado" }
      });
    }

    User.findById(req.body.userId, function(err, user) {
      if (err) {
        return res.status(500).json({
          title: "Ocorreu um erro1",
          error: err
        });
      }
      if (!user) {
        return res.status(500).json({
          title: "Usuário não encontrado",
          error: { message: "Usuário não encontrado" }
        });
      }
      /*     if (req.params.id != decoded.mykey ) {
             //localStorage.clear();
             return res.status(401).json({
                title: 'Não autenticado',
                error: {message: 'Os usuários não combinam jwt' },

            });
        }  */

      //super
      //61
      //112
      //76
      let conjuge = null;
      if (
        req.body.conjuge == null ||
        req.body.conjuge == undefined ||
        req.body.conjuge == " "
      ) {
        conjuge = user.conjuge;
        req.body.conjuge = null;
      } else conjuge = req.body.conjuge;

      if (usermaster.email == "adm@adm.com") {
        user.firstName = req.body.firstName;
        user.lastName = req.body.lastName;
        //password
        user.email = req.body.email;
        user.congregation = req.body.congregation;
        user.circuito = req.body.circuito;
        user.mobilephone = req.body.mobilephone;
        user.phone = req.body.phone;
        user.datebirth = req.body.datebirth;
        user.responsable = req.body.responsable;
        user.conjuge = req.body.conjuge;
        user.sex = req.body.sex;
        user.privilege = req.body.privilege;
        user.eldermail = req.body.eldermail;
      }

      user.vezesmes = req.body.vezesmes;
      user.config = req.body.config;
      console.log("ALEXALEX", user.vezesmes);
      // released
      // if (req.body.lastday != null)user.lastday = req.body.lastday;
      //role
      user.save(function(err, result) {
        if (err) {
          return res.status(500).json({
            title: "Ocorreu um erro4",
            error: err
          });
        }

        if (conjuge) {
          User2.findById(conjuge, function(err, user2) {
            if (err) {
              return console.log(err);
            }
            if (!user2) {
              return console.log("conjuge nao encontrado no cadastro");
            }
            if (req.body.conjuge == null) user2.conjuge = null;
            else user2.conjuge = result._id;
            user2.config = result.config;
            user2.vezesmes = result.vezesmes;
            user2.save();
          });
        }

        return res.status(200).json({
          message: "Atualização do usuário feita com sucesso!",
          obj: result
        });
      });
    });
  });
});

router.delete("/:id", function(req, res, next) {
  //   var decoded = jwt.decode(req.query.token);
  User.findById(req.params.id, function(err, user) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro5",
        error: err
      });
    }
    if (!user) {
      return res.status(500).json({
        title: "Usuário não encontrado!",
        error: { message: "Usuário não encontrado" }
      });
    }
    /*      if (req.params.id != decoded.user._id) {
            return res.status(401).json({
                title: 'Not Authenticated',
                error: {message: 'Users do not match'}
            });
        } */
    user.remove(function(err, result) {
      if (err) {
        return res.status(500).json({
          title: "Ocorreu um erro6",
          error: err
        });
      }

      if (user.telegram) {
        telegram.bot.kickChatMember(process.env.GROUPTELEGRAM, user.telegram, {
          until_date: Math.round((Date.now() + ms("1m")) / 1000)
        });
      }

      return res.status(200).json({
        message: "Usuario deletado",
        obj: result
      });
    });
  });
});

router.patch("/newpass/:id", function(req, res, next) {
  var decoded = jwt.decode(req.query.token);

  User.findById(req.params.id, function(err, user) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro7",
        error: err
      });
    }
    if (!user) {
      return res.status(500).json({
        title: "Usuário não encontrado!",
        error: { message: "Usuário não encontrado" }
      });
    }
    if (user._id != decoded.mykey) {
      localStorage.clear();
      return res.status(401).json({
        title: "Não autenticado",
        error: { message: "Usuário não combina" }
      });
    }

    if (!bcrypt.compareSync(req.body.oldpassword, user.password)) {
      return res.status(401).json({
        title: "Falha no login",
        error: { message: "Credenciais inválidas" }
      });
    }

    user.password = bcrypt.hashSync(req.body.newpassword, 10);
    user.save(function(err, result) {
      if (err) {
        return res.status(500).json({
          title: "Ocorreu um erro8",
          error: err
        });
      }

      result.password = " ";
      result.role = " ";
      return res.status(200).json({
        message: "Senha atualizada",
        obj: result
      });
    });
  });
});

module.exports = router;
