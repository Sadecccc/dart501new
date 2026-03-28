const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const games = {};

io.on("connection", (socket) => {

  socket.on("createGame", ({ name }) => {
    const gameId = Math.random().toString(36).substring(2, 8);

    games[gameId] = {
      players: [{ id: socket.id, name }],
      scores: { [socket.id]: 501 },
      turn: socket.id,
      doubleOut: true
    };

    socket.join(gameId);
    socket.emit("gameCreated", gameId);
    io.to(gameId).emit("gameUpdate", games[gameId]);
  });

  socket.on("joinGame", ({ gameId, name }) => {
    const game = games[gameId];
    if (!game) return;

    game.players.push({ id: socket.id, name });
    game.scores[socket.id] = 501;

    socket.join(gameId);
    io.to(gameId).emit("gameUpdate", game);
  });

  socket.on("throw", ({ gameId, points, isDouble }) => {
    const game = games[gameId];
    if (!game) return;

    if (game.turn !== socket.id) return;

    let currentScore = game.scores[socket.id];
    let newScore = currentScore - points;

    if (newScore < 0 || newScore === 1) {
      nextPlayer(game);
      return io.to(gameId).emit("gameUpdate", game);
    }

    if (newScore === 0 && game.doubleOut && !isDouble) {
      nextPlayer(game);
      return io.to(gameId).emit("gameUpdate", game);
    }

    game.scores[socket.id] = newScore;

    if (newScore === 0) {
      io.to(gameId).emit("gameOver", { winner: socket.id });
      return;
    }

    nextPlayer(game);
    io.to(gameId).emit("gameUpdate", game);
  });

  function nextPlayer(game) {
    const idx = game.players.findIndex(p => p.id === game.turn);
    game.turn = game.players[(idx + 1) % game.players.length].id;
  }

});

const PORT = process.env.PORT || 3000;
server.listen(PORT);
