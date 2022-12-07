var express = require('express');
var router = express.Router();
var Escala = require('../models/escala');
var Emailconfirm = require('../models/emailconfirm');
var nodemailer = require('nodemailer');
var moment = require('moment');
var telegram = require('../routes/telegram');
var path = require('path');

var socket = null;

const SUPORTEMAIL = process.env.SUPORTEMAIL;
const PASSEMAIL = process.env.PASSEMAIL;

const reqPath = path.join(__dirname, '../');


moment.locale('pt-br');





router.post('/confirm/:hash', function (req, res, next) {

  Emailconfirm.findOne({
    idescala: req.query.qs1,
    iduser: req.query.qs2,
    idhora: req.query.qs3
  }, function (err, emailconfirm) {

    if (err) {
      console.log(err);
      return res.end("<h1>Bad Request</h1>");

    }

    if (!emailconfirm) {
      console.log('emailconfirm não encontrado');
      return res.end("<h1>Bad Request</h1>");


    }

    if (req.params.hash == emailconfirm.hash) {

      Escala.findById(req.query.qs1, function (err, escala) {

        if (err) {
          console.log('Erro escala');
          return res.end("<h1>Bad Request</h1>");

        }

        if (!escala) {
          console.log('escala não encontrada');
          return res.end("<h1>Bad Request</h1>");

        }



        for (let p = 0; p < escala.pontos.length; p++) {
          for (let u = 0; u < escala.pontos[p].length; u++) {
            for (let s = 0; s < escala.pontos[p][u].npubs; s++) {

              if (escala.pontos[p][u].pubs[s].userId == req.query.qs2) {
                let sim = false;
                let nao = false;
                if (req.query.qs0 == 'S') {
                  sim = true;
                  nao = false;
                }

                if (req.query.qs0 == 'N') {
                  sim = false;
                  nao = true;
                  let irmao = `${escala.pontos[p][u].pubs[s].firstName} ${escala.pontos[p][u].pubs[s].lastName}`;
                  let userFriend = [];
                  for (let z = 0; z < escala.pontos[p][u].pubs.length; z++) {
                    if (req.query.qs2 != escala.pontos[p][u].pubs[z].userId) userFriend.push(escala.pontos[p][u].pubs[z]);
                  }

                  let text = `*Substituição TPE*
\nSubstituir: *${irmao}*
Dia: *${escala.dia} ${escala.diasemana}*
Hora: *${escala.hora[p].hora}*
Ponto: *${escala.pontos[p][u].name}*
Companheiro: `;

                  let complement = '';

                  userFriend.map(j => {

                    complement = complement + `*${j.firstName} ${j.lastName}*
Tel: *${j.mobilephone}*
Cong: *${j.congregation.nome}*
Circ: *${j.congregation.circuit}*\n`

                  })

                  let question = `\nQuem gostaria de substituir?`;
                  text = text + complement + question;
                  let textsub = '@' + req.query.qs1 + '%' + req.query.qs2 + '$' + req.query.qs3;
                  telegram.bot.sendMessage(process.env.GROUPTELEGRAM, text, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                      inline_keyboard: [[
                        {
                          text: '\u{1F504} Substituir',
                          callback_data: textsub
                        }
                      ]]
                    }
                  })
                }

                escala.pontos[p][u].pubs[s].sim = sim;
                escala.pontos[p][u].pubs[s].nao = nao;




                escala.markModified('pontos');
                escala.save(function (err, result) {
                  if (err) {
                    return res.end("<h1>Bad Request</h1>");
                  } else {

                    emailconfirm.remove(function (err, resultemail) {
                      if (err) {
                        console.log(err);

                      }
                    });

                    if (req.query.qs0 == 'S') resposta = 'Confirmado, obrigado!';
                    if (req.query.qs0 == 'N') resposta = 'Que pena, vamos tentar achar um substituto...';
                    console.log(resposta);
                    res.render('confirm', { resposta: resposta });

                  }
                });

              }
            }
          }
        }




      });

    }

  })



})


router.post('/:date', function (req, res, next) {
  const emails = [];

  let transporter = nodemailer.createTransport({
    host: 'smtp.mailgun.org',
    port: 465,
    secure: true,
    auth: {
      user: SUPORTEMAIL,
      pass: PASSEMAIL
    },
  });


  Escala.find({ datainicio: req.params.date }, function (err, escala) {
    if (err) {
      return res.status(500).json({
        title: 'Ocorreu um erro6',
        error: err
      });
    }

    if (!escala) {
      return res.status(500).json({
        title: 'Não encontrou escala',
        error: err
      });
    }



    for (let i = 0; i < escala.length; i++) {
      for (let p = 0; p < escala[i].pontos.length; p++) {

        for (let u = 0; u < escala[i].pontos[p].length; u++) {

          for (let s = 0; s < escala[i].pontos[p][u].pubs.length; s++) {

//filtro por email inicio
            //if ( escala[i].pontos[p][u].pubs[s].email == 'cerjuniorr@gmail.com' ) {

              let rand = Math.floor(Math.random() * 6553);
              let emailhash = new Emailconfirm({
                idescala: escala[i]._id,
                iduser: escala[i].pontos[p][u].pubs[s].userId,
                idhora: escala[i].hora[p].code,
                hash: rand
              });

              emailhash.save(function (err, emailresult) {
                if (err) {
                  console.log(err)
                }
                console.log(emailresult);

              });
              let hash1 = 'https://#/email/confirm/' + emailhash.hash + '?' + 'qs1=' + emailhash.idescala + '&qs0=S' + '&qs2=' + emailhash.iduser + '&qs3=' + emailhash.idhora;
              let hash2 = 'https://#/email/confirm/' + emailhash.hash + '?' + 'qs1=' + emailhash.idescala + '&qs0=N' + '&qs2=' + emailhash.iduser + '&qs3=' + emailhash.idhora;

              let text = emailtext(escala[i].pontos[p][u].pubs[s], escala[i].pontos[p][u], escala[i], hash1, hash2);
              console.log(text);
              let titulo = `Designação TPE para ${escala[i].pontos[p][u].pubs[s].firstName} ${escala[i].dia}`
              let mail = { user: escala[i].pontos[p][u].pubs[s], dia: escala[i].dia, hora: escala[i].hora[p].hora }
              emails.push(mail);
              let mailOptions = {
                from: `"TPE" <${SUPORTEMAIL}>`,
                to: escala[i].pontos[p][u].pubs[s].email,
                subject: titulo,
                html: text,

                attachments: [

                  // File Stream attachment
                  {
                    filename: 'tpelogo.png',
                    //path: __dirname + '/pictures/tpelogo.png',
                    path: reqPath  + `angular/assets/img/tpelogo.png`,
                    cid: 'jwlogo@logo' // should be as unique as possible
                  },



                  {
                    filename: 'img_ponto.jpeg',
                    path: `${escala[i].pontos[p][u].link}`,
                    cid: 'img_ponto@logo' // should be as unique as possible
                  }
                ],
              }


              transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                  console.log("Erro no envio para ", escala[i].pontos[p][u].pubs[s].firstName );
                  console.log("Email: ", escala[i].pontos[p][u].pubs[s].email );
                  console.log("Email: ", escala[i].pontos[p][u]);
                  console.log(error);
                } else {
                  console.log('Email enviado: ' + info.response + ' ' + escala[i].pontos[p][u].pubs[s].firstName + ' ' + escala[i].pontos[p][u].pubs[s].email  );


                }
              });

           // }//filtro por email fim
          }
        }
      }
    }







    res.status(200).json({
      message: 'Emails enviados!',
      obj: emails
    });

  });

  transporter.close();

});

function emailtext(pub, ponto, escala, hash1, hash2) {
  let corpoemail = []
  for (let p = 0; p < escala.pontos.length; p++) {

    for (let u = 0; u < escala.pontos[p].length; u++) {

      if (escala.pontos[p][u].id == ponto.id) {
        console.log("pontoigual", escala.pontos[p][u].id, ponto.id);
        corpo = { hora: escala.hora[p], ponto: escala.pontos[p][u] }
        corpoemail.push(corpo);

      }
    }
  }

  let diamoment = moment.utc(escala.data);
  let dia = moment.utc(diamoment).format('DD');
  let mes = moment(diamoment).format('MMMM');
  let ano = moment(diamoment).format('YYYY');
  let diasemana = escala.diasemana;

  console.log(diamoment, escala.dia, dia, mes, ano, diasemana);

  let estilolinha = ['#eaeaed', '#d2d2d4', '#bdbdbf'];

  let emailpronto = `<html>
	<head>
		<style type="text/css">
			@media only screen and (max-width: 640px){
				body.deviceWidth{
					width: 560px !important;
					padding: 0;
				}
			}

			@media only screen and (max-width: 479px){
				body.deviceWidth{
					width: 400px !important;
					padding: 0;
				}
      }

		</style>
	</head>
	<body>
		<table border="table" style="width:640px; border-collapse: collapse; font-family: sans-serif; font-size: 13px;">
			<tr>
    			<th valign="top" width="80" style="width: 80px; background-color: #4a6da7">
						<img src="cid:jwlogo@logo">
    			</th>
    			<th valign="top" width="80" style="width: 500px; vertical-align: middle;">
    				<h2 align="center"><br/>TESTEMUNHO PÚBLICO ESPECIAL</h2>
    			</th>
  			</tr>
  			<tr>
    			<td valign="top" colspan="2" style="padding: 10px;">
    				<p>Prezado irmão <b>${pub.firstName} ${pub.lastName}</b>.</p>
    				<p>Segue a escala para o dia <b>${dia} de ${mes} de ${ano} (${diasemana}).</b></p>
    				<p>Ponto: <b>${ponto.name}</b>
    					<br/>Endereço do ponto: <b>${ponto.address}</b>
    					<br/>Observações do ponto: <b>${ponto.obs}</b>
    				</p>
    				<p style="text-align: center">
							<img src="cid:img_ponto@logo" style="width: 400px; height: auto;"/>
    				</p>
    			</td>
  			</tr>
  			<tr>
  				<td valign="top" colspan="2" style="padding: 10px;">
  					<table cellpadding="5" border="table" align="center" style="width:620px; border-collapse: collapse; font-family: sans-serif; font-size: 12px;">
    					<tr style="background-color: #4a6da7; color: white">
    						<th>Horário</th>
    						<th>Pioneiro</th>
    						<th>Circuito</th>
    						<th>Congregação</th>
    						<th>Telefone</th>
    						<th>Celular</th>
                <th>Email</th>
                </tr>`;

  for (let x = 0; x < corpoemail.length; x++) {
    emailpronto = emailpronto + `<tr>
                        <td style="background-color:${estilolinha[x]}" rowspan="${corpoemail[x].ponto.pubs.length}" align="center">${corpoemail[x].hora.hora}</td>`;
    for (let z = 0; z < corpoemail[x].ponto.pubs.length; z++) {
      if(!corpoemail[x].ponto.pubs[z].congregation) continue;
      let corlinha = estilolinha[x];
      if (corpoemail[x].ponto.pubs[z].userId == pub.userId) corlinha = "#ffffff";
      if(z != 0)emailpronto = emailpronto + '<tr>';
 emailpronto = emailpronto + `<td style="background-color:${corlinha}"><b>${corpoemail[x].ponto.pubs[z]?.firstName} ${corpoemail[x].ponto.pubs[z]?.lastName}</b></td>
                        <td style="background-color:${corlinha}"><b>${corpoemail[x].ponto.pubs[z]?.congregation?.circuit}</b></td>
                        <td style="background-color:${corlinha}"><b>${corpoemail[x].ponto.pubs[z]?.congregation?.nome}</b></td>
                        <td style="background-color:${corlinha}"><b>${corpoemail[x].ponto.pubs[z]?.phone || ' '}</b></td>
                        <td style="background-color:${corlinha}"><b>${corpoemail[x].ponto.pubs[z]?.mobilephone || ' '}</b></td>
                        <td style="background-color:${corlinha}"><b>${corpoemail[x].ponto.pubs[z]?.email}</b></td></tr>`
    }
  }
  emailpronto = emailpronto + `
</table>
<br/>
<label>Favor confirmar sua designação no sistema TPE via Telegram ou pelo site <a href="${process.env.SITE}">${process.env.SITE}</a></label>
<br/>


</td>
</tr>
</table>
</body>
</html>
`;

  return emailpronto;

}




module.exports = router;
module.exports.pass = function (io) {

  socket = io;

};
