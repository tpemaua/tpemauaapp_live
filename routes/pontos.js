var express = require("express");
var router = express.Router();

var multer = require("multer");

var bodyParser = require("body-parser");
var multer = require("multer");
var fs = require("fs");

var bcrypt = require("bcryptjs");
//var jwt = require('jsonwebtoken');
var Sms = require("totalvoice-node").Sms;
var Perfil = require("totalvoice-node").Perfil;
var Ponto = require("../models/ponto");
var Feriado = require("../models/feriado");
var Hora = require("../models/hora");
var Circuito = require("../models/circuito");
var Congregation = require("../models/congregation");
var Validity = require("../models/validity");
var Especial = require("../models/especial");
var path = require("path");
var moment = require("moment");
var Escala = require("../models/escala");
var Anuncio = require("../models/anuncio");
var telegram = require("../routes/telegram");
var User = require("../models/user");
var nodemailer = require("nodemailer");
//var http = require('http');

const SUPORTEMAIL = process.env.SUPORTEMAIL;
const PASSEMAIL = process.env.PASSEMAIL;

const reqPath = path.join(__dirname, "../");
console.log(reqPath);

// const storage = multer.diskStorage({
//   destination: function(req, file, cb) {
//     cb(null, reqPath + "/angular/assets/img/");
//   },
//   filename: function(req, file, cb) {
//     cb(null, file.fieldname + "-" + Date.now() + ".jpeg");
//   }
// });

// const upload = multer({ storage: storage }).single("avatar");

//router.post("/images", function(req, res) {
  // upload(req, res, function(err) {
  //   if (err) {
  //     // An error occurred when uploading
  //     throw err;
  //   }
  //   res.json({
  //     sucess: true,
  //     message: "Image was uploaded successfully",
  //     namefile: res.req.file.filename
  //   });
  //   // Everything went fine
  // });
//});

router.get("/", function(req, res, next) {
  //var decoded = jwt.decode(req.query.token);

  Ponto.find().exec(function(err, pontos) {
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

    res.status(200).json({
      message: "Sucesso ao pegar lista de pontos",
      obj: pontos
    });
  });
});

router.post("/", function(req, res, next) {
  let config = [[], [], [], [], [], [], [], []];

  console.log(req.body);

  let pontos = new Ponto({
    name: req.body.name,
    npubs: req.body.npubs,
    date: req.body.date,
    config: config,
    address: req.body.address,
    obs: req.body.obs,
    fileimg: req.body.fileimg,
    link: req.body.link
  });

  console.log(pontos);
  pontos.save(function(err, result) {
    if (err) {
      console.log(err);
      return res.status(500).json({
        title: "Ocorreu um erro*",
        error: err
      });
    }

    res.status(201).json({
      message: "pontos Criado",
      obj: result
    });
  });
});

router.delete("/:id", function(req, res, next) {
  //   var decoded = jwt.decode(req.query.token);
  Ponto.findById(req.params.id, function(err, ponto) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro5",
        error: err
      });
    }
    console.log("AAAAAAAAAAA->");
    console.log(ponto);
    if (!ponto) {
      return res.status(500).json({
        title: "Ponto não encontrado!",
        error: { message: "Ponto não encontrado" }
      });
    }
    //    if (req.params.id != decoded.user._id) {
    //        return res.status(401).json({
    //            title: 'Not Authenticated',
    //            error: {message: 'Users do not match'}
    //        });
    //    }
    ponto.remove(function(err, result) {
      if (err) {
        return res.status(500).json({
          title: "Ocorreu um erro6",
          error: err
        });
      }
      res.status(200).json({
        message: "Ponto deletado",
        obj: result
      });
    });
  });
});

router.put("/", function(req, res, next) {
  console.log("servidor", req.body[0].config[7]);

  for (let i = 0; i < req.body.length; i++) {
    Ponto.findById(req.body[i].id, function(err, ponto) {
      if (err) {
        return res.status(500).json({
          title: "Ocorreu um erro2",
          error: err
        });
      }

      ponto.config = req.body[i].config;
      ponto.save(function(err, result) {});
    });
  }

  res.status(201).json({
    message: "Dados atualizados",
    obj: "OK"
  });
});

router.put("/edit", function(req, res, next) {
  console.log("servidor", req.body);

  Ponto.findById(req.body.id, function(err, ponto) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro2",
        error: err
      });
    }

    ponto.name = req.body.name;
    ponto.npubs = req.body.npubs;
    ponto.date = req.body.date;
    ponto.address = req.body.address;
    ponto.obs = req.body.obs;
    ponto.fileimg = req.body.fileimg;
    ponto.link = req.body.link;
    ponto.save(function(err, result) {});
  });

  res.status(201).json({
    message: "Dados atualizados",
    obj: "OK"
  });
});

//Envio de SMS correto
router.post("/sms", function(req, res, next) {
  console.log("tempo servidor eh", req.body.tempo);
  const cliente = new Sms("310fcd69b556b412d75c6a65bb5f6d8b");
  cliente
    .enviar(
      req.body.telefone,
      req.body.meutexto,
      (opcoes = { resposta_usuario: true, data_criacao: req.body.tempo })
    )
    .then(data => {
      console.log("SMS enviado", data);

      res.status(200).json({
        message: "Sms enviado",
        obj: data
      });
    })
    .catch(error => {
      console.error("Problemas ao enviar SMS", error);
    });
});

router.post("/telegram", function(req, res, next) {
  telegram.bot.sendMessage(req.body.id, req.body.message);
  res.status(200).json({
    message: "Telegram enviado",
    obj: "ok"
  });
});

router.get("/telegramresposta", function(req, res, next) {});

router.get("/sms", function(req, res, next) {
  const cliente = new Perfil("310fcd69b556b412d75c6a65bb5f6d8b");
  cliente
    .consultaSaldo()
    .then(function(data) {
      console.log(data);

      res.status(200).json({
        message: "Capturado credito existente SMS",
        obj: data
      });
    })
    .catch(function(error) {
      console.error("Erro: ", error);
    });
});

router.get("/smsresposta/:id", function(req, res, next) {
  const cliente = new Sms("310fcd69b556b412d75c6a65bb5f6d8b");
  console.log("aqui aqui", req.params.id);
  cliente
    .buscaSms(req.params.id)
    .then(function(data) {
      console.log(data);

      res.status(200).json({
        message: "Capturado resposta",
        obj: data
      });
    })
    .catch(function(error) {
      console.error("Erro: ", error);
    });
});

//Cadastro de horas
router.get("/hora", function(req, res, next) {
  Hora.find().exec(function(err, hora) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro13",
        error: err
      });
    }

    res.status(200).json({
      message: "Sucesso ao pegar lista de horas",
      obj: hora
    });
  });
});

router.post("/hora", function(req, res, next) {
  var hora = new Hora({
    code: req.body.code,
    hora: req.body.hora
  });

  hora.save(function(err, result) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro*",
        error: err
      });
    }

    res.status(201).json({
      message: "pontos Criado",
      obj: result
    });
  });
});

router.delete("/hora/:id", function(req, res, next) {
  Hora.findById(req.params.id, function(err, hora) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro5",
        error: err
      });
    }

    if (!hora) {
      return res.status(500).json({
        title: "Hora não encontrada!",
        error: { message: "Hora não encontrada" }
      });
    }

    hora.remove(function(err, result) {
      if (err) {
        return res.status(500).json({
          title: "Ocorreu um erro6",
          error: err
        });
      }
      res.status(200).json({
        message: "Hora deletada",
        obj: result
      });
    });
  });
});

router.put("/hora/edit", function(req, res, next) {
  Hora.findById(req.body.idhora, function(err, hora) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro5",
        error: err
      });
    }

    if (!hora) {
      return res.status(500).json({
        title: "Hora não encontrada!",
        error: { message: "Hora não encontrada" }
      });
    }
    hora.code = req.body.code;
    hora.hora = req.body.hora;
    hora.save(function(err, result) {
      if (err) {
        return res.status(500).json({
          title: "Ocorreu um erro6",
          error: err
        });
      }
      res.status(200).json({
        message: "Hora atualizada",
        obj: result
      });
    });
  });
});
//Cadastro de feriados
router.get("/feriado", function(req, res, next) {
  Feriado.find().exec(function(err, feriado) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro13",
        error: err
      });
    }

    if (!feriado) {
      return res.status(500).json({
        title: "Feriado não encontrado!",
        error: { message: "Feriado não encontrado" }
      });
    }

    res.status(200).json({
      message: "Sucesso ao pegar lista de feriados",
      obj: feriado
    });
  });
});

router.post("/feriado", function(req, res, next) {
  console.log("feriado", req.body);
  var feriado = new Feriado({
    feriado: req.body.feriado,
    data: req.body.data,
    datashow: req.body.datashow
  });

  feriado.save(function(err, result) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro*",
        error: err
      });
    }

    res.status(201).json({
      message: "Feriado Criado",
      obj: result
    });
  });
});

router.delete("/feriado/:id", function(req, res, next) {
  Feriado.findById(req.params.id, function(err, feriado) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro5",
        error: err
      });
    }

    if (!feriado) {
      return res.status(500).json({
        title: "Feriado não encontrado!",
        error: { message: "Feriado não encontrado" }
      });
    }

    feriado.remove(function(err, result) {
      if (err) {
        return res.status(500).json({
          title: "Ocorreu um erro6",
          error: err
        });
      }
      res.status(200).json({
        message: "Feriado deletado",
        obj: result
      });
    });
  });
});

router.put("/feriado/edit", function(req, res, next) {
  Feriado.findById(req.body.idferiado, function(err, feriado) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro5",
        error: err
      });
    }

    if (!feriado) {
      return res.status(500).json({
        title: "Feriado não encontrado!",
        error: { message: "Feriado não encontrado" }
      });
    }

    feriado.feriado = req.body.feriado;
    feriado.data = req.body.data;
    feriado.datashow = req.body.datashow;

    feriado.save(function(err, result) {
      if (err) {
        return res.status(500).json({
          title: "Ocorreu um erro6",
          error: err
        });
      }
      res.status(200).json({
        message: "Feriado atualizado",
        obj: result
      });
    });
  });
});

//Cadastro de circuitos
router.get("/circuito/:id", function(req, res, next) {
  Circuito.find().exec(function(err, circuito) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro13",
        error: err
      });
    }

    console.log(circuito);
    let circuitos = circuito.filter(f => {
      console.log(req.params.id, f._id);
      // if (req.params.id == "5ae7dee5734d1d133184274f") {
      //   if (f.nome != "SP-61") return false; //61
      // }

      // if (req.params.id == "5ae7dfb9734d1d1331842777") {
      //   if (f.nome != "SP-76") return false; //76
      // }

      // if (req.params.id == "5ae7dfa1734d1d1331842774") {
      //   if (f.nome != "SP-112") return false; //112
      // }

      return true;
    });

    console.log(circuitos);

    res.status(200).json({
      message: "Sucesso ao pegar lista de circuitos",
      obj: circuitos
    });
  });
});

router.get("/circuito/all/:id", function(req, res, next) {
  Circuito.find().exec(function(err, circuito) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro13",
        error: err
      });
    }

    res.status(200).json({
      message: "Sucesso ao pegar lista de circuitos",
      obj: circuito
    });
  });
});

router.post("/circuito", function(req, res, next) {
  console.log("circuito", req.body);
  var circuito = new Circuito({
    nome: req.body.nome
  });

  circuito.save(function(err, result) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro*",
        error: err
      });
    }

    res.status(201).json({
      message: "Circuito Criado",
      obj: result
    });
  });
});

router.delete("/circuito/:id", function(req, res, next) {
  Circuito.findById(req.params.id, function(err, circuito) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro5",
        error: err
      });
    }

    if (!circuito) {
      return res.status(500).json({
        title: "Circuito não encontrado!",
        error: { message: "Circuito não encontrado" }
      });
    }

    circuito.remove(function(err, result) {
      if (err) {
        return res.status(500).json({
          title: "Ocorreu um erro6",
          error: err
        });
      }
      res.status(200).json({
        message: "Circuito deletado",
        obj: result
      });
    });
  });
});

router.put("/circuito/edit", function(req, res, next) {
  Circuito.findById(req.body.id, function(err, circuito) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro5",
        error: err
      });
    }

    if (!circuito) {
      return res.status(500).json({
        title: "Circuito não encontrado!",
        error: { message: "Circuito não encontrado" }
      });
    }

    circuito.nome = req.body.nome;
    circuito.save(function(err, result) {
      if (err) {
        return res.status(500).json({
          title: "Ocorreu um erro6",
          error: err
        });
      }
      res.status(200).json({
        message: "Circuito modificado",
        obj: result
      });
    });
  });
});

//Cadastro de anuncios

router.get("/anuncio/:id", function(req, res, next) {
  Anuncio.find().exec(function(err, anuncios) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro13",
        error: err
      });
    }

    res.status(200).json({
      message: "Sucesso ao pegar lista de anuncios",
      obj: anuncios
    });
  });
});

router.post("/anuncio", function(req, res, next) {
  console.log("anuncio", req.body);
  var anuncio = new Anuncio({
    titulo: req.body.titulo,
    mensagem: req.body.mensagem,
    avisado: false,
    avisadoemail: false
  });

  anuncio.save(function(err, result) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro*",
        error: err
      });
    }

    res.status(201).json({
      message: "Anuncio Criado",
      obj: result
    });
  });
});

router.delete("/anuncio/:id", function(req, res, next) {
  Anuncio.findById(req.params.id, function(err, anuncio) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro5",
        error: err
      });
    }

    if (!anuncio) {
      return res.status(500).json({
        title: "Anuncio não encontrado!",
        error: { message: "Anuncio não encontrado" }
      });
    }

    anuncio.remove(function(err, result) {
      if (err) {
        return res.status(500).json({
          title: "Ocorreu um erro6",
          error: err
        });
      }
      res.status(200).json({
        message: "Anuncio deletado",
        obj: result
      });
    });
  });
});

router.put("/anuncio/edit", function(req, res, next) {
  Anuncio.findById(req.body.id, function(err, anuncio) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro5",
        error: err
      });
    }

    if (!anuncio) {
      return res.status(500).json({
        title: "Anuncio não encontrado!",
        error: { message: "Anuncio não encontrado" }
      });
    }

    anuncio.titulo = req.body.titulo;
    anuncio.mensagem = req.body.mensagem;
    anuncio.save(function(err, result) {
      if (err) {
        return res.status(500).json({
          title: "Ocorreu um erro6",
          error: err
        });
      }
      res.status(200).json({
        message: "Anuncio modificado",
        obj: result
      });
    });
  });
});

router.put("/anuncio/avisa", function(req, res, next) {
  Anuncio.findById(req.body.id, function(err, anuncio) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro5",
        error: err
      });
    }

    if (!anuncio) {
      return res.status(500).json({
        title: "Anuncio não encontrado!",
        error: { message: "Anuncio não encontrado" }
      });
    }

    anuncio.avisado = req.body.avisado;
    anuncio.save(function(err, result) {
      if (err) {
        return res.status(500).json({
          title: "Ocorreu um erro6",
          error: err
        });
      }

      User.find().exec(function(err, users) {
        const resp = `*Anúncio: ${anuncio.titulo}*

${anuncio.mensagem}`;

        for (let i = 0; i < users.length; i++) {
          if (users[i].telegram) {
            try {
              telegram.bot.sendMessage(users[i].telegram, resp, {
                parse_mode: "Markdown"
              });
              console.log(users[i].email);
            } catch (e) {
              console.log(`erro no envio para ${users[i].email}`);
              console.log(e);
            }
          }
        }
      });

      res.status(200).json({
        message: "Anúncio enviado",
        obj: result
      });
    });
  });
});

router.put("/anuncio/avisaemail", function(req, res, next) {
  Anuncio.findById(req.body.id, function(err, anuncio) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro5",
        error: err
      });
    }

    if (!anuncio) {
      return res.status(500).json({
        title: "Anuncio não encontrado!",
        error: { message: "Anuncio não encontrado" }
      });
    }

    anuncio.avisadoemail = req.body.avisadoemail;
    anuncio.save(function(err, result) {
      if (err) {
        return res.status(500).json({
          title: "Ocorreu um erro6",
          error: err
        });
      }

      User.find().exec(function(err, users) {
        const titulo = `TPE Anúncio: ${anuncio.titulo}`;

        const corpo = `${anuncio.mensagem}`;

        const tpe = "tpe";

        let transporter = nodemailer.createTransport({
          host: "smtp.mailgun.org",
          port: 465,
          secure: true,
          auth: {
            user: SUPORTEMAIL,
            pass: PASSEMAIL
          }
        });

        for (let i = 0; i < users.length; i++) {
          if (users[i].email) {
            if (
              users[i].email == "aleksluciano@gmail.com" ||
              users[i].email == "cerjuniorr@gmail.com"
            ) {
              if (
                !users[i].email
                  .toString()
                  .toLowerCase()
                  .includes(tpe)
              ) {
                const mailOptions = {
                  from: `"TPE" <${SUPORTEMAIL}>`,
                  to: users[i].email,
                  subject: titulo,
                  text: corpo
                };

                transporter.sendMail(mailOptions, function(error, info) {
                  if (error) {
                    console.log(error);
                  } else {
                    console.log("Email enviado: " + info.response);
                  }
                });
              }
            }
          }
        }
      });

      res.status(200).json({
        message: "Anúncio enviado",
        obj: result
      });
    });
  });
});

//Cadastro de congregações
router.get("/congregation/:id", function(req, res, next) {
  Congregation.find().exec(function(err, congregation) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro13",
        error: err
      });
    }

    let congregations = congregation.filter(f => {
      // if (req.params.id == "5ae7dee5734d1d133184274f") {
      //   if (f.circuit != "SP-61") return false; //61
      // }

      // if (req.params.id == "5ae7dfb9734d1d1331842777") {
      //   if (f.circuit != "SP-76") return false; //76
      // }

      // if (req.params.id == "5ae7dfa1734d1d1331842774") {
      //   if (f.circuit != "SP-112") return false; //112
      // }

      return true;
    });

    res.status(200).json({
      message: "Sucesso ao pegar lista de congregações",
      obj: congregations
    });
  });
});

router.get("/congregation/all/:id", function(req, res, next) {
  Congregation.find().exec(function(err, congregation) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro13",
        error: err
      });
    }

    res.status(200).json({
      message: "Sucesso ao pegar lista de congregações",
      obj: congregation
    });
  });
});

router.post("/congregation", function(req, res, next) {
  console.log("congregacao", req.body);
  var congregation = new Congregation({
    nome: req.body.nome,
    circuit: req.body.circuit
  });

  congregation.save(function(err, result) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro*",
        error: err
      });
    }

    res.status(201).json({
      message: "Congregação Criada",
      obj: result
    });
  });
});

router.delete("/congregation/:id", function(req, res, next) {
  Congregation.findById(req.params.id, function(err, congregation) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro5",
        error: err
      });
    }

    if (!congregation) {
      return res.status(500).json({
        title: "Congregação não encontrada!",
        error: { message: "Congregação não encontrada" }
      });
    }

    congregation.remove(function(err, result) {
      if (err) {
        return res.status(500).json({
          title: "Ocorreu um erro6",
          error: err
        });
      }
      res.status(200).json({
        message: "Congregação deletada",
        obj: result
      });
    });
  });
});

router.put("/congregation/edit", function(req, res, next) {
  Congregation.findById(req.body.id, function(err, congregation) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro5",
        error: err
      });
    }

    if (!congregation) {
      return res.status(500).json({
        title: "Congregação não encontrada!",
        error: { message: "Congregação não encontrada" }
      });
    }

    congregation.nome = req.body.nome;
    congregation.circuit = req.body.circuit;
    congregation.save(function(err, result) {
      if (err) {
        return res.status(500).json({
          title: "Ocorreu um erro6",
          error: err
        });
      }
      res.status(200).json({
        message: "Congregação deletada",
        obj: result
      });
    });
  });
});

////Vigência

//Cadastro de vigência
router.get("/validity", function(req, res, next) {
  Validity.find().exec(function(err, validity) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro13",
        error: err
      });
    }

    res.status(200).json({
      message: "Sucesso ao pegar lista de vigências",
      obj: validity
    });
  });
});

router.get("/validity/last", function(req, res, next) {
  Validity.find({ status: true }).exec(function(err, validity) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro13",
        error: err
      });
    }

    validity.sort(function(a, b) {
      return a.begin > b.begin ? -1 : a.begin < b.begin ? 1 : 0;
    });

    res.status(200).json({
      message: "Sucesso ao pegar ultima lista de vigências",
      obj: validity
    });
  });
});

router.post("/validity", function(req, res, next) {
  var validity = new Validity({
    begin: req.body.begin,
    end: req.body.end,
    status: false
  });

  validity.save(function(err, result) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro*",
        error: err
      });
    }

    res.status(201).json({
      message: "Vigência Criada",
      obj: result
    });
  });
});

router.delete("/validity/:id", function(req, res, next) {
  Validity.findById(req.params.id, function(err, validity) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro5",
        error: err
      });
    }

    if (!validity) {
      return res.status(500).json({
        title: "Vigência não encontrada!",
        error: { message: "Vigência não encontrada" }
      });
    }

    let data = moment.utc(validity.begin).format("DD-MM-YYYY");
    Escala.findOne({ datainicio: data }, function(err2, escala) {
      if (err2) {
        return res.status(500).json({
          title: "Ocorreu um erro6",
          error: err
        });
      }

      if (escala) {
        return res.status(500).json({
          title: "Operação impossível!",
          error: { message: "Existe uma escala para esta vigência" }
        });
      }

      validity.remove(function(err, result) {
        if (err) {
          return res.status(500).json({
            title: "Ocorreu um erro6",
            error: err
          });
        }
        res.status(200).json({
          message: "Vigência deletada",
          obj: result
        });
      });
    });
  });
});

router.put("/validity/edit", function(req, res, next) {
  Validity.findById(req.body.id, function(err, validity) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro5",
        error: err
      });
    }

    if (!validity) {
      return res.status(500).json({
        title: "Vigência não encontrada!",
        error: { message: "Vigência não encontrada" }
      });
    }

    validity.begin = req.body.begin;
    validity.end = req.body.end;
    validity.status = req.body.status;
    validity.save(function(err, result) {
      if (err) {
        return res.status(500).json({
          title: "Ocorreu um erro6",
          error: err
        });
      }
      res.status(200).json({
        message: "Vigência atualizada",
        obj: result
      });
    });
  });
});

//cadastro de dia especial

//Cadastro de vigência
router.get("/especial", function(req, res, next) {
  Especial.find().exec(function(err, especial) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro13",
        error: err
      });
    }

    res.status(200).json({
      message: "Sucesso ao pegar lista de vigências",
      obj: especial
    });
  });
});

router.post("/especial", function(req, res, next) {
  var especial = new Especial({
    begin: req.body.begin,
    end: req.body.end,
    circuito: req.body.circuito,
    nome: req.body.nome
  });

  especial.save(function(err, result) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro*",
        error: err
      });
    }

    res.status(201).json({
      message: "Vigência Criada",
      obj: result
    });
  });
});

router.delete("/especial/:id", function(req, res, next) {
  Especial.findById(req.params.id, function(err, especial) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro5",
        error: err
      });
    }

    if (!especial) {
      return res.status(500).json({
        title: "Dia especial não encontrado!",
        error: { message: "Dia especial não encontrado" }
      });
    }

    especial.remove(function(err, result) {
      if (err) {
        return res.status(500).json({
          title: "Ocorreu um erro6",
          error: err
        });
      }
      res.status(200).json({
        message: "Dia especial deletado",
        obj: result
      });
    });
  });
});

router.put("/especial/edit", function(req, res, next) {
  Especial.findById(req.body.id, function(err, especial) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro5",
        error: err
      });
    }

    if (!especial) {
      return res.status(500).json({
        title: "Vigência não encontrada!",
        error: { message: "Vigência não encontrada" }
      });
    }

    especial.begin = req.body.begin;
    especial.end = req.body.end;
    especial.circuito = req.body.circuito;
    especial.nome = req.body.nome;
    especial.save(function(err, result) {
      if (err) {
        return res.status(500).json({
          title: "Ocorreu um erro6",
          error: err
        });
      }
      res.status(200).json({
        message: "Vigência atualizada",
        obj: result
      });
    });
  });
});

//role
router.post("/perfilrole", function(req, res, next) {
  let conjuge = null;
  let responsable = null;
  let config = [[], [], [], [], [], [], []];

  console.log(req.body);

  let user = new User({
    firstName: "TPE CTC",
    lastName: "TPE CTC",
    password: bcrypt.hashSync(req.body.senha, 10),
    email: req.body.email,
    congregation: null,
    circuito: null,
    mobilephone: 11999999999,
    phone: 11999999999,
    datebirth: new Date(2017, 0, 1, 3, 0, 0),
    responsable: responsable,
    conjuge: conjuge,
    sex: "M",
    privilege: "PU",
    eldermail: req.body.email,
    config: config,
    released: false,
    lastday: new Date(2017, 0, 1, 3, 0, 0),
    role: req.body.role
  });

  console.log(user);
  user.save(function(err, result) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro9",
        error: err
      });
    }

    return res.status(201).json({
      message: "Usuário role Criado",
      obj: result
    });
  });
});

router.get("/perfilrole/:id", function(req, res, next) {
  User.find({ role: { $in: ["ctc", "gold"] } }).exec(function(err, userctc) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro13",
        error: err
      });
    }

    let user = [];

    for (let i = 0; i < userctc.length; i++) {
      userperfil = {
        email: userctc[i].email,
        senha: " ",
        role: userctc[i].role,
        id: userctc[i]._id
      };

      user.push(userperfil);
    }

    res.status(200).json({
      message: "Sucesso ao pegar lista de usuarios perfilrole",
      obj: user
    });
  });
});

router.delete("/perfilrole/:id", function(req, res, next) {
  User.findById(req.params.id, function(err, userctc) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro5",
        error: err
      });
    }

    if (!userctc) {
      return res.status(500).json({
        title: "perfilrole não encontrado!",
        error: { message: "perfilrole não encontrado" }
      });
    }

    userctc.remove(function(err, result) {
      if (err) {
        return res.status(500).json({
          title: "Ocorreu um erro6",
          error: err
        });
      }
      res.status(200).json({
        message: "perfilrole deletado",
        obj: result
      });
    });
  });
});

router.put("/perfilrole/edit", function(req, res, next) {
  User.findById(req.body.id, function(err, userctc) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro5",
        error: err
      });
    }

    if (!userctc) {
      return res.status(500).json({
        title: "perfilrole não encontrada!",
        error: { message: "perfilrole não encontrada" }
      });
    }

    userctc.email = req.body.email;
    userctc.role = req.body.role;

    userctc.save(function(err, result) {
      if (err) {
        return res.status(500).json({
          title: "Ocorreu um erro6",
          error: err
        });
      }
      res.status(200).json({
        message: "perfilrole atualizada",
        obj: result
      });
    });
  });
});

module.exports = router;
