import { Chess } from '/node_modules/chess.js/dist/esm/chess.js'
import { onDragStart, onSnapEnd,  } from './chessEvents.js'

var board = null
var game = new Chess()
var $status = $('#status')
var $fen = $('#fen')
var $pgn = $('#pgn')
var $moveFeedback = $('#moveFeedback');

//const updateStatusFn = updateStatus(game, $status, $fen, $pgn);

var bestMove = null;
var blunderMove = null;

function loadPosition() {
  var username = document.getElementById('username').value;
  $.ajax({
    url: 'http://127.0.0.1:5000/hello_world',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ username: username }),
    success: function(response) {
        // Assuming the API returns a FEN string in the "fen" field
        var fen = response.fen;
        board.position(fen);
        bestMove = response.best_move;
        blunderMove = response.blunder_move;
        game.load(fen);  // Update the game state
        updateStatus();  // Update the status display
    },
    error: function(error) {
        console.error('Error fetching position:', error);
    }
  });
}

function onDrop(game, updateStatus) {
  return function(source, target) {
    var move = game.move({
      from: source,
      to: target,
      promotion: 'q'  // always promote to a queen for simplicity
    });

    // illegal move
    if (move === null) return 'snapback';

    updateStatus();  // Update the status display

    // Check the move against the best_move and blunder_move
    var playerMove = source + target;
    var feedbackMessage = `Your move: ${playerMove}. `;

    if (playerMove === bestMove) {
      feedbackMessage += 'That was the best move';
    } else if (playerMove === blunderMove) {
      feedbackMessage += 'That was the blunder';
    } else {
      feedbackMessage += 'That was neither best move nor blunder';
    }

    $moveFeedback.text(feedbackMessage);


  };
}

function updateStatus () {
  var status = ''

  var moveColor = 'White'
  if (game.turn() === 'b') {
    moveColor = 'Black'
  }

  // checkmate?
  if (game.isCheckmate()) {
    status = 'Game over, ' + moveColor + ' is in checkmate.'
  }

  // draw?
  else if (game.isDraw()) {
    status = 'Game over, drawn position'
  }

  // game still on
  else {
    status = moveColor + ' to move'

    // check?
    if (game.isCheck()) {
      status += ', ' + moveColor + ' is in check'
    }
  }

  $status.html(status)
  $fen.html(game.fen())
  $pgn.html(game.pgn())
}

// Attach event listener to the button
document.getElementById('submitUsername').addEventListener('click', function() {
  var username = document.getElementById('username').value;
  loadPosition(username);
});

var config = {
  draggable: true,
  position: 'start',
  pieceTheme: 'node_modules/@chrisoakman/chessboardjs/dist/img/chesspieces/wikipedia/{piece}.png',
  onDragStart: onDragStart(game),
  onDrop: onDrop(game, updateStatus),
  onSnapEnd: function() { onSnapEnd(game, board)(); }
}

board = Chessboard('myBoard', config)

updateStatus()
