var express = require("express");
var router = express.Router();
var mongoose = require("mongoose");
var Escala = require("../models/escala");
var User = require("../models/user");
var Led = require("../models/led");
var telegram = require("../routes/telegram");
var cron = require("node-cron");
var moment = require("moment");
var Subhist = require("../models/subhist");

var socket = null;

var tempo_designa_auto = "10 21 * * 0-6";
var tempo_rejeita_auto = "0 22 * * 0-6";
var tempo_deleta_auto = "0 21 * * 0-6";
var tempo_lembrete_auto = "0 17 * * 0-6";
//designa automatico
cron.schedule(tempo_designa_auto, function() {
  selectEscala();
});

function selectEscala() {
  let diaatual = moment.utc().add(1, "day");
  let dia = new Date(diaatual);
  let tomorrowmonth = dia.getMonth();
  let tomorrowyear = dia.getFullYear();
  let tomorrowday = dia.getDate();

  let dataini = new Date(tomorrowyear, tomorrowmonth, tomorrowday, 0, 0, 0);
  let datafim = new Date(tomorrowyear, tomorrowmonth, tomorrowday, 5, 0, 0);
  console.log(dataini);
  console.log(datafim);
  Escala.findOne({ data: { $gte: dataini, $lte: datafim } }, function(
    err,
    escala
  ) {
    if (err) {
      return console.log("erro schedule");
    }

    if (!escala) {
      return console.log("sem escala");
    }

    let registro = [];
    for (let p = 0; p < escala.pontos.length; p++) {
      for (let u = 0; u < escala.pontos[p].length; u++) {
        for (let s = 0; s < escala.pontos[p][u].npubs; s++) {
          if (escala.pontos[p][u].pubs[s]) {
            registro.push({
              ponto: escala.pontos[p][u].name,
              username: escala.pontos[p][u].pubs[s].firstName,
              user: { ...escala.pontos[p][u].pubs[s] },
              horacode: escala.hora[p].code,
              nao: false,
              sim: false,
              sub: {},
              sex: escala.pontos[p][u].pubs[s].sex,
              p: p,
              u: u,
              s: s
            });
          }
        }
      }
    }

    Led.find({ idescala: escala._id }).exec(function(err, leds) {
      if (err) {
        console.log("erro schedule");
      }

      if (!leds) {
        return console.log("erro schedule");
      }

      for (let i = 0; i < leds.length; i++) {
        let led = leds[i];

        let reg = registro.find(a => a.user.userId == led.iduser);
        if (led.sub) reg.sex = led.sub.sex;
        if (reg) {
          reg.sim = led.sim;
          reg.nao = led.nao;
          reg.sub = led.sub;
        }
      }

      let mudanca = [];

      for (let p = 0; p < escala.pontos.length; p++) {
        for (let u = 0; u < escala.pontos[p].length; u++) {
          let user1 = {};
          let user2 = {};
          for (let s = 0; s < escala.pontos[p][u].npubs; s++) {
            if (escala.pontos[p][u].pubs[s]) {
              if (s == 0) {
                user1 = registro.find(
                  a => a.user.userId == escala.pontos[p][u].pubs[s].userId
                );
              } else if (s == 1) {
                user2 = registro.find(
                  a => a.user.userId == escala.pontos[p][u].pubs[s].userId
                );
              }
            }
          }

          if (
            user1 &&
            user2 &&
            ((user1.sim && user2.nao && !user2.sub) ||
              (user1.nao && !user1.sub && user2.sim) ||
              (user1.nao && !user1.sub && user2.nao && user2.sub) ||
              (user1.nao && user1.sub && user2.nao && !user2.sub))
          ) {
            if (user1.sim || user1.sub) mudanca.push({ ...user1 });
            if (user2.sim || user2.sub) mudanca.push({ ...user2 });
          }
        }
      }

      imprime(escala, registro);
      console.log(
        "//////////////////////////////////////////////////////////////////////////////////////////////"
      );

      let troca = [];
      let ajustados = [];

      procuraSemParceiro(escala, registro, mudanca, ajustados);

      ajustados.forEach(aj => {
        console.log(aj.user, aj.dia, aj.hora, aj.foipara, aj.telegram);
      });

      imprime(escala, registro);
      if (ajustados.length > 0) {
        escala.markModified("pontos");
        escala.save(function(err, result) {
          if (err) {
            return console.log(err);
          }

          ajustados.forEach(usergram => {
            let message = `*Ajuste de designação TPE*
      
Mudança no *Ponto* da sua designação de amanhã
            
Irmão: *${usergram.user}*
Dia: *${usergram.dia} ${usergram.diasemana}*
Hora: *${usergram.hora}*
Ponto: *${usergram.foipara}*
Companheiro: *${usergram.comp}* 
      
 _A mudança foi necessária, pois você estava sem companhia até o presente momento.
Por favor, verifique o status no site TPE.
Bom trabalho!!_`;

            if (usergram.telegram) {
              telegram.bot
                .sendMessage(usergram.telegram, message, {
                  parse_mode: "Markdown"
                })
                .then(m => {
                  console.log(m);
                })
                .catch(erro0 => {
                  console.log(erro0);
                });
            }
          });
        });
      }
    });
  });
}

function imprime(escala, registro) {
  for (let p = 0; p < escala.pontos.length; p++) {
    for (let u = 0; u < escala.pontos[p].length; u++) {
      console.log("////////////////", escala.pontos[p][u].name);
      for (let s = 0; s < escala.pontos[p][u].npubs; s++) {
        if (escala.pontos[p][u].pubs[s]) {
          let reg = registro.find(
            a => a.user.userId == escala.pontos[p][u].pubs[s].userId
          );
          if (reg && reg.sub) console.log(reg.sub.firstName);
          else if (reg) console.log(reg.user.firstName);
        } else console.log("sem nome");
      }
    }
  }
}

function procuraSemParceiro(escala, registro, mudanca, ajustados) {
  mudanca.sort((a, b) => {
    return a.sim ? 1 : !a.sim ? -1 : 0;
  });
  mudanca.forEach(muda => {
    let escolheOutro = false;
    let cond = false;
    let jaFoi = ajustados.find(
      a => a.id1 == muda.user.userId || a.id2 == muda.user.userId
    );
    if (!jaFoi)
      for (let rep = 0; rep < 2; rep++) {
        if (escolheOutro) break;
        if (cond > 0) cond = true;
        for (let p = 0; p < escala.pontos.length; p++) {
          if (escolheOutro) break;
          for (let u = 0; u < escala.pontos[p].length; u++) {
            if (escolheOutro) break;
            let user1 = null;
            let user2 = null;

            if (escala.hora[p].code == muda.horacode)
              for (let s = 0; s < escala.pontos[p][u].npubs; s++) {
                if (escala.pontos[p][u].name !== muda.ponto)
                  if (escala.pontos[p][u].pubs[s]) {
                    if (s == 0) {
                      user1 = registro.find(
                        a => a.user.userId == escala.pontos[p][u].pubs[s].userId
                      );
                    } else if (s == 1) {
                      user2 = registro.find(
                        a => a.user.userId == escala.pontos[p][u].pubs[s].userId
                      );
                    }
                  }
              }

            let userChange = null;
            let compUser = null;
            if (
              user1 &&
              user2 &&
              ((user1.sim && user2.nao && !user2.sub) ||
                (user1.nao && !user1.sub && user2.sim) ||
                (user1.nao && !user1.sub && user2.nao && user2.sub) ||
                (user1.nao && user1.sub && user2.nao && !user2.sub))
            ) {
              if (user1 && user2) {
                if (
                  user1.nao &&
                  !user1.sub &&
                  user2.sim &&
                  muda.user.sex == user2.sex
                ) {
                  escala.pontos[muda.p][muda.u].pubs[muda.s] = {
                    ...escala.pontos[p][u].pubs[0]
                  };
                  escala.pontos[p][u].pubs[0] = { ...muda.user };
                  userChange = muda;
                  compUser = user2;
                } else if (
                  user1.nao &&
                  !user1.sub &&
                  user2.sub &&
                  muda.user.sex == user2.sub.sex &&
                  cond
                ) {
                  escala.pontos[muda.p][muda.u].pubs[muda.s] = {
                    ...escala.pontos[p][u].pubs[0]
                  };
                  escala.pontos[p][u].pubs[0] = { ...muda.user };
                  userChange = muda;
                  compUser = user2;
                } else if (
                  user2.nao &&
                  !user2.sub &&
                  user1.sim &&
                  muda.user.sex == user1.sex
                ) {
                  escala.pontos[muda.p][muda.u].pubs[muda.s] = {
                    ...escala.pontos[p][u].pubs[1]
                  };
                  escala.pontos[p][u].pubs[1] = { ...muda.user };
                  userChange = muda;
                  compUser = user1;
                } else if (
                  user2.nao &&
                  !user2.sub &&
                  user1.sub &&
                  muda.user.sex == user1.sub.sex &&
                  cond
                ) {
                  escala.pontos[muda.p][muda.u].pubs[muda.s] = {
                    ...escala.pontos[p][u].pubs[1]
                  };
                  escala.pontos[p][u].pubs[1] = { ...muda.user };
                  userChange = muda;
                  compUser = user1;
                }
                if (userChange) {
                  if (userChange.sub) {
                    ajustados.push({
                      id1: userChange.sub.userId,
                      id2: compUser.user.userId,
                      user: userChange.sub.firstName,
                      telegram: userChange.sub.telegram,
                      foipara: escala.pontos[p][u].name,
                      comp: compUser.sub
                        ? compUser.sub.firstName + " " + compUser.sub.lastName
                        : compUser.user.firstName +
                          " " +
                          compUser.user.lastName,
                      dia: escala.dia,
                      hora: escala.hora[p].hora,
                      diasemana: escala.diasemana
                    });
                  } else {
                    ajustados.push({
                      id1: userChange.user.userId,
                      id2: compUser.user.userId,
                      user: userChange.user.firstName,
                      telegram: userChange.user.telegram,
                      foipara: escala.pontos[p][u].name,
                      comp: compUser.sub
                        ? compUser.sub.firstName + " " + compUser.sub.lastName
                        : compUser.user.firstName +
                          " " +
                          compUser.user.lastName,
                      dia: escala.dia,
                      hora: escala.hora[p].hora,
                      diasemana: escala.diasemana
                    });
                  }
                  escolheOutro = true;
                  break;
                }
              }
            }
          }
        }
      }
  });
}

//rejeita automatico quem não respondeu
cron.schedule(tempo_rejeita_auto, function() {
  let tresDiasDepois = moment.utc().add(3, "day");
  let dataTresDiasDepois = new Date(tresDiasDepois);
  let dataTresDiasDepoisMonth = dataTresDiasDepois.getMonth();
  let dataTresDiasDepoisYear = dataTresDiasDepois.getFullYear();
  let dataTresDiasDepoisDay = dataTresDiasDepois.getDate();

  let dataini = new Date(
    dataTresDiasDepoisYear,
    dataTresDiasDepoisMonth,
    dataTresDiasDepoisDay,
    0,
    0,
    0
  );
  let datafim = new Date(
    dataTresDiasDepoisYear,
    dataTresDiasDepoisMonth,
    dataTresDiasDepoisDay,
    3,
    0,
    0
  );

  Escala.findOne({ data: { $gte: dataini, $lte: datafim } }, function(
    err,
    escala
  ) {
    if (err) {
      return console.log("erro schedule");
    }

    if (!escala) {
      return console.log("erro schedule");
    }

    Led.find({ idescala: escala._id, nao: false, sim: false }, function(
      err,
      leds
    ) {
      if (err) {
        console.log("erro schedule");
      }

      if (!leds) {
        return console.log("erro schedule");
      }

      for (let i = 0; i < leds.length; i++) {
        let led = leds[i];
        led.nao = true;
        rejectThem(led, escala);
      }
    });
  });
});

function rejectThem(led, escala) {
  led.save().then(() => {
    if (led.msg != undefined) {
      let text = led.msg.text + "\n\u{274C} *Recusado*";
      telegram.bot
        .editMessageText(text, {
          chat_id: led.msg.chat.id,
          message_id: led.msg.message_id,
          parse_mode: "Markdown"
        })
        .then(() => {
          console.log("edit led");
        })
        .catch(e => {
          console.log(e);
        });
    }

    atualiza_central_via_socket(
      led.idescala,
      led.iduser,
      led.horacode,
      led.sim,
      led.nao,
      "led",
      " "
    );

    for (let p = 0; p < escala.pontos.length; p++) {
      for (let u = 0; u < escala.pontos[p].length; u++) {
        for (let s = 0; s < escala.pontos[p][u].npubs; s++) {
          if (
            escala.pontos[p][u].pubs[s].userId == led.iduser &&
            escala.hora[p].code == led.horacode
          ) {
            let irmao = `${escala.pontos[p][u].pubs[s].firstName} ${escala.pontos[p][u].pubs[s].lastName}`;

            let userFriend = [];
            for (let z = 0; z < escala.pontos[p][u].pubs.length; z++) {
              if (led.iduser != escala.pontos[p][u].pubs[z].userId) {
                userFriend.push(escala.pontos[p][u].pubs[z]);
                if (
                  escala.pontos[p][u].pubs[z].userId ==
                  escala.pontos[p][u].pubs[s].conjuge
                ) {
                  Led.findOne(
                    {
                      idescala: escala._id,
                      nao: false,
                      sim: true,
                      horacode: led.horacode,
                      iduser: escala.pontos[p][u].pubs[s].conjuge
                    },
                    function(err3, ledConjuge) {
                      if (err3) {
                        return console.log("erro ledconjuge");
                      }

                      if (!ledConjuge) {
                        return console.log("erro ledconjuge");
                      }

                      if (ledConjuge.nao) {
                        return console.log("conjuge ja disse nao");
                      }
                      ledConjuge.nao = true;
                      ledConjuge.sim = false;
                      setTimeout(() => {
                        rejectThem(ledConjuge, escala);
                      }, 1000);
                    }
                  );
                }
              }
            }

            let text = `*Substituição TPE*
\nSubstituir: *${irmao}*
Dia: *${escala.dia} ${escala.diasemana}*
Hora: *${escala.hora[p].hora}*
Ponto: *${escala.pontos[p][u].name}*
Companheiro: `;

            let complement = "";
            let parceiroid = "";

            userFriend.map(j => {
              parceiroid = j.userId;

              complement =
                complement +
                `*${j.firstName} ${j.lastName}*
Tel: *${j.mobilephone}*
Cong: *${j.congregation.nome}*
Circ: *${j.congregation.circuit}*\n`;
            });

            let question = `\nQuem gostaria de substituir?`;
            text = text + complement + question;
            let textsub =
              "@" + led.idescala + "%" + led.iduser + "$" + led.horacode;
            console.log(textsub);
            console.log(userFriend);
            try {
              telegram.bot
                .sendMessage(process.env.GROUPTELEGRAM, text, {
                  parse_mode: "Markdown",
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: "\u{1F504} Substituir",
                          callback_data: textsub
                        }
                      ]
                    ]
                  }
                })
                .then(msg => {
                  let subhist = new Subhist({
                    message_id: msg.message_id,
                    datareal: escala.data
                  });

                  subhist.save();
                });
            } catch (er) {
              console.log(er);
            }
          }
        }
      }
    }

    return "schedule recusa OK save";
  });
}

//deleta mensagens enviadas pra grupo sub
cron.schedule(tempo_deleta_auto, function() {
  let diaatual = moment.utc().add(1, "day");
  let dia = new Date(diaatual);
  let tomorrowmonth = dia.getMonth();
  let tomorrowyear = dia.getFullYear();
  let tomorrowday = dia.getDate();

  let dataini = new Date(tomorrowyear, tomorrowmonth, tomorrowday, 0, 0, 0);
  let datafim = new Date(tomorrowyear, tomorrowmonth, tomorrowday, 5, 0, 0);

  Subhist.find({ datareal: { $gte: dataini, $lte: datafim } }, function(
    err,
    subhist
  ) {
    if (err) {
      return console.log("erro subhist");
    }

    if (!subhist) {
      return console.log("falta de subhist");
    }

    subhist.forEach(sub => {
      telegram.bot
        .deleteMessage(process.env.GROUPTELEGRAM, sub.message_id)
        .then(msg => console.log("mensagem apagada", msg))
        .catch(erro => {
          console.log(erro);

          let text = "💼 - Tempo para substituição ultrapassado...";
          telegram.bot
            .editMessageText(text, {
              chat_id: process.env.GROUPTELEGRAM,
              message_id: sub.message_id,
              parse_mode: "Markdown"
            })
            .then(msgf => console.log("mensagem modificada", msgf))
            .catch(error => {
              console.log(error);
            });
        });
    });
    return console.log("sucesso subhist shedule");
  });
});

//lembrete de designação
cron.schedule(tempo_lembrete_auto, function() {
  let diaatual = moment.utc().add(1, "day");
  let dia = new Date(diaatual);
  let tomorrowmonth = dia.getMonth();
  let tomorrowyear = dia.getFullYear();
  let tomorrowday = dia.getDate();

  console.log(dia);

  console.log("shcedule funcionando");

  let dataini = new Date(tomorrowyear, tomorrowmonth, tomorrowday, 0, 0, 0);
  let datafim = new Date(tomorrowyear, tomorrowmonth, tomorrowday, 3, 0, 0);

  Escala.findOne({ data: { $gte: dataini, $lte: datafim } }, function(
    err,
    escala
  ) {
    if (err) {
      return console.log("erro schedule");
    }

    if (!escala) {
      return console.log("erro schedule");
    }

    Led.find({ idescala: escala._id, nao: false })
      .populate("iduser")
      .exec(function(err, leds) {
        if (err) {
          console.log("erro schedule");
        }

        if (!leds) {
          return console.log("erro schedule");
        }

        for (let i = 0; i < leds.length; i++) {
          try {
            if (leds[i].iduser.telegram) {
              telegram.bot.sendMessage(
                leds[i].iduser.telegram,
                `*Lembrete:* Você tem uma designação amanhã ${escala.dia} ${escala.diasemana}. Favor verificar o status do seu companheiro(a) no site TPE. Bom trabalho!`,
                { parse_mode: "Markdown" }
              );
            }
            console.log(leds[i].iduser.firstName);
          } catch (e) {
            console.log(e);
          }
        }

        return console.log("sucesso schedule");
      });
  });
});

router.post("/", function(req, res, next) {
  //var decoded = jwt.decode(req.query.token);

  let erro = false;
  let detalheerro;
  for (let i = 0; i < req.body.length; i++) {
    let escala = new Escala({
      dia: req.body[i].dia,
      diasemana: req.body[i].diasemana,
      datainicio: req.body[i].datainicio,
      datafim: req.body[i].datafim,
      data: req.body[i].data,
      hora: req.body[i].hora,
      pontos: req.body[i].pontos
    });

    escala.save(function(err, result) {
      if (err) {
        return res.status(500).json({
          title: "Ocorreu um erro6",
          error: err
        });
      }

      if (!result) return console.log(err);

      for (let p = 0; p < escala.pontos.length; p++) {
        for (let u = 0; u < escala.pontos[p].length; u++) {
          for (let s = 0; s < escala.pontos[p][u].pubs.length; s++) {
            if (escala.pontos[p][u].pubs[s].userId) {
              User.findById(escala.pontos[p][u].pubs[s].userId, function(
                err,
                user
              ) {
                user.contavezes = escala.pontos[p][u].pubs[s].contavezes;
                user.mesescalado = escala.data.getMonth();
                user.lastday = escala.data;
                user.escala.push(mongoose.Types.ObjectId(result._id));
                user.save();

                let led = new Led({
                  datainicio: escala.datainicio,
                  datafim: escala.datafim,
                  idescala: mongoose.Types.ObjectId(escala._id),
                  iduser: mongoose.Types.ObjectId(user._id),
                  horacode: escala.hora[p].code,
                  indexpub: s,
                  sim: false,
                  nao: false,
                  sub: {},
                  lock: false,
                  msg: {},
                  data: escala.data
                });

                led
                  .save()
                  .then(() => {
                    console.log("certo", user._id);
                  })
                  .catch(err => {
                    // mongoose connection error will be handled here
                    console.log("erro", err);
                  });
              });
            }
          }
        }
      }
    });
  }

  return res.status(201).json({
    message: "Escala Salva",
    obj: "OK"
  });
});

router.delete("/:date", function(req, res, next) {
  Escala.find({ datainicio: req.params.date }, function(err, escala) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro6",
        error: err
      });
    }

    for (let i = 0; i < escala.length; i++) {
      for (let p = 0; p < escala[i].pontos.length; p++) {
        for (let u = 0; u < escala[i].pontos[p].length; u++) {
          for (let s = 0; s < escala[i].pontos[p][u].pubs.length; s++) {
            if (escala[i].pontos[p][u].pubs[s]) {
              User.findById(escala[i].pontos[p][u].pubs[s].userId, function(
                err,
                user
              ) {
                try {
                  let tao;
                  for (let h = 0; h < user.escala.length; h++) {
                    console.log(user.escala[h], escala[i]._id);
                    let esc1 = JSON.stringify(user.escala[h]);
                    let esc2 = JSON.stringify(escala[i]._id);
                    tao = esc2;
                    console.log(typeof esc1, typeof esc2);
                    console.log(esc1, esc2);
                    if (esc1 == esc2) {
                      user.escala.remove(user.escala[h]);
                      user.lastday = new Date(
                        2017,
                        0,
                        escala[i].data.getDate(),
                        3,
                        0,
                        0
                      );
                      console.log("userid_salvo", escala[i]._id, user.escala);
                      break;
                    }
                  }
                  console.log("tinha delete", tao);
                  console.log("escala esta", user.escala);
                  user.markModified("escala");
                  user
                    .save()
                    .then(() => {
                      console.log("certo", user._id);
                    })
                    .catch(err => {
                      // mongoose connection error will be handled here
                      console.log("erro", err);
                    });
                } catch (e) {
                  console.log("CATCHerror", user, e);
                }
              });
            }
          }
        }
      }

      escala[i].remove(function(err, result) {
        if (err) {
          return res.status(500).json({
            title: "Ocorreu um erro6",
            error: err
          });
        }

        Led.remove({ idescala: escala[i]._id }, function(err, led) {
          if (err) {
            console.log(err);
          }
        });
      }); //delete escala
    }

    return res.status(200).json({
      message: "Escala deletada",
      obj: "ok"
    });
  });
});

router.get("/:date", function(req, res, next) {
  Escala.find({ datainicio: req.params.date }, function(err, escala) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro14",
        error: err
      });
    }

    return res.status(200).json({
      message: "Escala capturada",
      obj: escala
    });
  });
});

router.get("/perfil/:id", function(req, res, next) {
  User.findById(req.params.id, function(err, user) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro14",
        error: err
      });
    }

    if (!user) {
      return res.status(500).json({
        title: "Sem designações",
        error: err
      });
    }

    let today = new Date();
    let todaymonth = today.getMonth();
    let todayyear = today.getFullYear();
    let todayday = today.getDate();

    Escala.find(
      {
        _id: { $in: user.escala },
        data: { $gte: new Date(todayyear, todaymonth, todayday, 0, 0, 0) }
      },
      function(err, escalas) {
        console.log("acheiescala");
        if (err) {
          return res.status(500).json({
            title: "Ocorreu um erro14",
            error: err
          });
        }

        if (!escalas) {
          return res.status(500).json({
            title: "Ocorreu um erro14",
            error: err
          });
        }

        return res.status(200).json({
          message: "Escala perfil capturada",
          obj: escalas
        });
      }
    );
  });
});

router.get("/led/designations/:id", function(req, res, next) {
  User.findById(req.params.id, function(err, user) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro14",
        error: err
      });
    }

    if (!user) {
      return res.status(500).json({
        title: "Sem designações",
        error: err
      });
    }

    Led.find({ idescala: { $in: user.escala } }, function(err, leds) {
      console.log("acheiescala");
      if (err) {
        return res.status(500).json({
          title: "Ocorreu um erro14",
          error: err
        });
      }

      if (!leds) {
        return res.status(500).json({
          title: "Ocorreu um erro14",
          error: err
        });
      }

      return res.status(200).json({
        message: "Leds capturados",
        obj: leds
      });
    });
  });
});

router.get("/led/all/:date", function(req, res, next) {
  Led.find({ datainicio: req.params.date }, function(err, leds) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro14",
        error: err
      });
    }

    return res.status(200).json({
      message: "Leds capturados capturada",
      obj: leds
    });
  });
});

router.post("/led/allreport", function(req, res, next) {
  let data1 = new Date(req.body.begin);

  let datamonth_ini = data1.getMonth();
  let datayear_ini = data1.getFullYear();
  let dataday_ini = data1.getDate();

  let data2 = new Date(req.body.end);

  let datamonth_fim = data2.getMonth();
  let datayear_fim = data2.getFullYear();
  let dataday_fim = data2.getDate();

  let dataini = new Date(datayear_ini, datamonth_ini, dataday_ini, 0, 0, 0);
  let datafim = new Date(datayear_fim, datamonth_fim, dataday_fim, 3, 0, 0);

  console.log(dataini);
  console.log(datafim);

  Escala.find({ data: { $gte: dataini, $lte: datafim } }, function(
    err,
    escalas
  ) {
    console.log(escalas.length);
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro14",
        error: err
      });
    }

    if (!escalas) {
      return res.status(500).json({
        title: "Ocorreu um erro14",
        error: err
      });
    }

    let grupoescala = [];
    for (let i = 0; i < escalas.length; i++) {
      grupoescala.push(escalas[i]._id);
    }

    Led.find({ idescala: { $in: grupoescala } })
      .populate("iduser")
      .populate("idescala")
      .exec(function(err, leds) {
        if (err) {
          return res.status(500).json({
            title: "Ocorreu um erro14",
            error: err
          });
        }

        return res.status(200).json({
          message: "Leds capturados capturada",
          obj: leds
        });
      });
  });
});

router.put("/led/:id", function(req, res, next) {
  console.log(req.body);

  Led.findOne(
    {
      idescala: req.body.idescala,
      iduser: req.body.iduser,
      horacode: req.body.horacode
    },
    function(err, led) {
      if (err) {
        return res.status(500).json({
          title: "Ocorreu um erro2",
          error: err
        });
      }

      if (!led) {
        return res.status(500).json({
          title: "Escala não existe!",
          error: err
        });
      }

      if (led.nao) {
        let resposta = {
          resp: "ja",
          sim: led.sim,
          nao: led.nao
        };

        return res.status(500).json({
          title: "Respondido pelo Telegram!",
          error: { message: "Atualize a página" }
        });
      }

      led.sim = req.body.sim;
      led.nao = req.body.nao;

      led
        .save()
        .then(() => {
          console.log("led atualizado", led.iduser);

          if (led.sim && led.msg != undefined) {
            let text = led.msg.text + "\n\u{2705} *Confirmado*";
            telegram.bot
              .editMessageText(text, {
                chat_id: led.msg.chat.id,
                message_id: led.msg.message_id,
                parse_mode: "Markdown"
              })
              .then(() => {
                console.log("edit led");
              })
              .catch(e => {
                console.log(e);
              });
          }

          if (led.nao && led.msg != undefined) {
            let text = led.msg.text + "\n\u{274C} *Recusado*";
            telegram.bot
              .editMessageText(text, {
                chat_id: led.msg.chat.id,
                message_id: led.msg.message_id,
                parse_mode: "Markdown"
              })
              .then(() => {
                console.log("edit led");
              })
              .catch(e => {
                console.log(e);
              });
          }

          atualiza_central_via_socket(
            req.body.idescala,
            req.body.iduser,
            req.body.horacode,
            req.body.sim,
            req.body.nao,
            "led",
            " "
          );

          if (led.sim) {
            return res.status(201).json({
              message: "Dados atualizados",
              obj: "OK"
            });
          }

          if (led.nao) {
            Escala.findById(req.body.idescala, function(err, escala) {
              for (let p = 0; p < escala.pontos.length; p++) {
                for (let u = 0; u < escala.pontos[p].length; u++) {
                  for (let s = 0; s < escala.pontos[p][u].npubs; s++) {
                    if (
                      escala.pontos[p][u].pubs[s].userId == req.body.iduser &&
                      escala.hora[p].code == req.body.horacode
                    ) {
                      let irmao = `${escala.pontos[p][u].pubs[s].firstName} ${escala.pontos[p][u].pubs[s].lastName}`;

                      let userFriend = [];
                      for (
                        let z = 0;
                        z < escala.pontos[p][u].pubs.length;
                        z++
                      ) {
                        if (
                          req.body.iduser != escala.pontos[p][u].pubs[z].userId
                        )
                          userFriend.push(escala.pontos[p][u].pubs[z]);
                      }

                      let text = `*Substituição TPE*
\nSubstituir: *${irmao}*
Dia: *${escala.dia} ${escala.diasemana}*
Hora: *${escala.hora[p].hora}*
Ponto: *${escala.pontos[p][u].name}*
Companheiro: `;

                      let complement = "";
                      let parceiroid = "";

                      userFriend.map(j => {
                        parceiroid = j.userId;

                        complement =
                          complement +
                          `*${j.firstName} ${j.lastName}*
Tel: *${j.mobilephone}*
Cong: *${j.congregation.nome}*
Circ: *${j.congregation.circuit}*\n`;
                      });

                      let question = `\nQuem gostaria de substituir?`;
                      text = text + complement + question;
                      let textsub =
                        "@" +
                        req.body.idescala +
                        "%" +
                        req.body.iduser +
                        "$" +
                        req.body.horacode;
                      console.log(textsub);
                      console.log(userFriend);
                      try {
                        telegram.bot
                          .sendMessage(process.env.GROUPTELEGRAM, text, {
                            parse_mode: "Markdown",
                            reply_markup: {
                              inline_keyboard: [
                                [
                                  {
                                    text: "\u{1F504} Substituir",
                                    callback_data: textsub
                                  }
                                ]
                              ]
                            }
                          })
                          .then(msg => {
                            let subhist = new Subhist({
                              message_id: msg.message_id,
                              datareal: escala.data
                            });

                            subhist.save();
                          });
                      } catch (e) {
                        console.log(e);
                      }
                      console.log("Problema");
                    }
                  }
                }
              }
            });
            return res.status(201).json({
              message: "Dados atualizados",
              obj: "OK"
            });
          }
        })
        .catch(err => {
          console.log(err);
          return res.status(500).json({
            title: "Ocorreu um erro2",
            error: err
          });
        });
    }
  );
});

function atualiza_central_via_socket(
  idescala,
  iduser,
  horacode,
  sim,
  nao,
  mytype,
  myuser
) {
  socket.sockets.emit("grabEscala", {
    header: `Evento Socket emitido pelo servidor por ${iduser}`,
    idescala: idescala,
    iduser: iduser,
    horacode: horacode,
    sim: sim,
    nao: nao,
    type: mytype,
    user: myuser
  });
}

module.exports = router;
module.exports.start = function(io) {
  io.on("connection", function(socket) {
    console.log("New user connected");

    socket.on("disconnect", function() {
      console.log("User was disconnected");
    });
  });
  socket = io;
};
