const db = require("../../models");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const passwordHash = require("../../helper/passwordHash");
const generateToken = require("../../helper/generateToken");

module.exports = {
  signup: (request, response) => {
    const requestBodyKeys = Object.keys(request.body);
    const neccessaryKeys = ["username", "password", "email"];
    for (let i = 0; i < neccessaryKeys.length; i++) {
      if (requestBodyKeys.includes(neccessaryKeys[i]) === false) {
        return response.status(400).send("bad request");
      }
    }

    for (let i = 0; i < neccessaryKeys.length; i++) {
      if (request.body[neccessaryKeys[i]] === "") {
        return response.status(400).send("bad request");
      }
    }

    db.User.findOrCreate({
      where: { email: request.body.email },
      defaults: {
        username: request.body.username,
        password: passwordHash(request.body.password),
        profile_photo_url: request.file
          ? request.file.location
          : "https://user-images.githubusercontent.com/62422486/98907760-b282a200-2502-11eb-9e27-acb392842a92.png",
        introduce: request.body.introduce ? request.body.introduce : null,
      },
    })
      .then(([result, created]) => {
        if (!created) {
          return response.status(409).send("존재하는 아이디 입니다");
        }
        const token = generateToken(request.body.email, result.id);
        return response
          .status(201)
          .json({ message: "회원가입 성공!", token: token });
      })
      .catch((error) => {
        response.status(500).send(error);
      });
  },

  signin: (request, response) => {
    db.User.findOne({ where: { email: request.body.email } })
      .then((user) => {
        if (!user) {
          response
            .status(401)
            .json({ message: "계정이 없습니다", code: "401a" });
        }
        if (user.password === passwordHash(request.body.password)) {
          const token = generateToken(request.body.email, user.id);
          response.status(200).json({ message: "로그인 성공!", token: token });
        } else {
          response
            .status(401)
            .json({ message: "잘못된 정보 입니다", code: "401b" });
        }
      })
      .catch((error) => response.status(500).send(error));
  },

  signout: (request, response) => {
    response.cookie("access-token");
    response.status(204).send("로그아웃 성공");
  },

  mypage: (request, response) => {
    db.User.findAll({
      where: { email: request.params.email },
      attributes: ["id", "username", "email", "profile_photo_url", "introduce"],
      include: [
        {
          model: db.Content,
          attributes: ["id", "title", "createdAt", "updatedAt"],
        },
      ],
    })
      .then((userInfo) => {
        response.status(200).json(userInfo);
      })
      .catch((error) => {
        response.status(500).send(error);
      });
  },

  updateMypage: (request, response) => {
    let hashedPassword = passwordHash(request.body.password);
    db.User.update(
      {
        username: request.body.username,
        password: hashedPassword,
      },
      {
        where: { id: request.decoded.id },
      }
    )
      .then((result) => {
        response.status(200).send("내 정보 수정 성공");
      })
      .catch((error) => {
        response.status(500).send(error);
      });
  },
};
