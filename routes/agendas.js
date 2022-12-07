var express = require("express");
var router = express.Router();
var User = require("../models/user");
var Agenda = require("../models/agenda");
var mongoose = require("mongoose");
var moment = require("moment");


/* router.use('/', function (req, res, next) {
    console.log("cheguei");
    jwt.verify(req.query.token, 'secret', function (err, decoded) {
        if (err) {
            return res.status(401).json({
                title: 'Not Authenticated',
                error: err
            });
        }
        next();
    })
}); */

router.get("/", function(req, res, next) {
  //var decoded = jwt.decode(req.query.token);

  let today = new Date();
  let todaymonth = today.getMonth();
  let todayyear = today.getFullYear();
  let todayday = today.getDate();

  Agenda.find({ datareal: { $gte: new Date(todayyear, todaymonth, todayday, 0, 0, 0) }}).exec(function(err, agendas) {
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
      message: "Sucesso ao pegar agendas",
      obj: agendas
    });
  });
});

router.post("/", function(req, res, next) {
  //var decoded = jwt.decode(req.query.token);
  User.findById(req.body.userId, function(err, user) {
    if (err) {
      return res.status(500).json({
        title: "An error occurred",
        error: err
      });
    }

    //xyz
  /*   let data = moment.utc(user.datebirth).format("DD-MM-YYYY");
    console.log(data); */
    let idade = getAge(user.datebirth);
    console.log(idade)
    if(idade < 18){

        return res.status(500).json({
          title: "Idade não permitida!",
          error: { message: "Apenas maiores de idade podem agendar" }
        });

    }


    var agenda = new Agenda({
      data: req.body.data,
      datashow: req.body.datashow,
      hora: req.body.hora,
      diasemana: req.body.diasemana,
      code: req.body.code,
      sex: user.sex,
      user: user,
      datareal: new Date(req.body.data)
    });

    Agenda.find({ data: req.body.data, hora: req.body.hora }).count(function(err, count) {
      console.log('VAGAS totais ' + req.body.rest + ' No banco ' + count  );
      if (count >= req.body.rest) {

        return res.status(500).json({
          title: "Vaga indisponível",
          error: { message: "A vaga já foi preenchida por outra pessoa"},
          func: 'out'


      });


      }

      agenda.save(function(err, result) {
        if (err) {
          return res.status(500).json({
            title: "Ocorreu um erro",
            error: err
          });
        }

        user.agenda.push(mongoose.Types.ObjectId(result._id));
        user.save();

        res.status(201).json({
          message: "Saved agenda",
          obj: user
        });
      });
    });
  });
});

router.delete("/:id", function(req, res, next) {
  //   var decoded = jwt.decode(req.query.token);
  Agenda.findById(req.params.id, function(err, agenda) {
    if (err) {
      return res.status(500).json({
        title: "Ocorreu um erro5",
        error: err
      });
    }

    if (!agenda) {
      return res.status(500).json({
        title: "Agenda não encontrada!",
        error: { message: "Agenda não encontrada" }
      });
    }
    //    if (req.params.id != decoded.user._id) {
    //        return res.status(401).json({
    //            title: 'Not Authenticated',
    //            error: {message: 'Users do not match'}
    //        });
    //    }
    console.log("aiai1", agenda);
    agenda.remove(function(err, result) {
      if (err) {
        console.log("aiai3", agenda);
        console.log(err);
        return res.status(500).json({
          title: "Ocorreu um erro6",
          error: err
        });
      }
      res.status(200).json({
        message: "Agenda deletada",
        obj: result
      });
    });
  });
});

function getAge(dateString) {
  let today = new Date();
  console.log(today);
  let birthDate = new Date(dateString);
  console.log(dateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  let m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m == 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  console.log(age);
  return age;
}

module.exports = router;
