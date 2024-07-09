import { Chess } from '/node_modules/chess.js/dist/esm/chess.js'
import { onDragStart, onSnapEnd } from './chessEvents.js'

var board = null
var game = new Chess()
var $status = $('#status')
var $fen = $('#fen')
var $pgn = $('#pgn')
var $moveFeedback = $('#moveFeedback');

var bestMove = null;
var blunderMove = null;

// $(document).ready(function() {
//   $('.main-container').hide(); // Hide the main content initially
// });

function startLoadingPositions(username) {
  $('#splash-overlay').hide();
  $('#loading-overlay').show();
  $.ajax({
      url: 'http://127.0.0.1:5000/start_loading',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ username: username }),
      success: function(response) {
          console.log(response.message);
          loadPosition(username);
      },
      error: function(error) {
          console.error('Error starting loading:', error);
          $('#loading-overlay').hide();
          $('#splash-overlay').show(); // Show splash screen again on error
      }
  });
}

function loadPosition(username) {
  $.ajax({
    url: `http://127.0.0.1:5000/get_position?username=${username}`,
    method: 'GET',
    success: function(response, status, xhr) {
      if (xhr.status === 202) {
        // Positions still loading, retry after a short delay
        setTimeout(() => loadPosition(username), 1000);
      } else if (response.fen) {
        // Position loaded successfully
        var fen = response.fen;
        board.position(fen);
        bestMove = response.best_move;
        blunderMove = response.blunder_move;
        game.load(fen);
        updateStatus();
        $('#loading-overlay').hide();
        $('.main-container').show();
      } else {
        console.log(response.message);
        $('#loading-overlay').hide();
        $('#splash-overlay').show();
      }
    },
    error: function(error) {
      console.error('Error fetching position:', error);
      $('#loading-overlay').hide();
      $('#splash-overlay').show();
    }
  });
}

// function loadPosition() {
//   var username = $('#username').val();
//   $.ajax({
//       url: `http://127.0.0.1:5000/get_position?username=${username}`,
//       method: 'GET',
//       success: function(response) {
//           if (response.fen) {
//               var fen = response.fen;
//               board.position(fen);
//               bestMove = response.best_move;
//               blunderMove = response.blunder_move;
//               game.load(fen);
//               updateStatus();
//               $('#loading-overlay').hide();
//               $('.main-container').show(); // Show the main content
//           } else {
//               console.log(response.message);
//               $('#loading-overlay').hide();
//               $('#splash-overlay').show(); // Show splash screen if no position is returned
//           }
//       },
//       error: function(error) {
//           console.error('Error fetching position:', error);
//           $('#loading-overlay').hide();
//           $('#splash-overlay').show(); // Show splash screen on error
//       }
//   });
// }

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

function resizeBoard() {
  board.resize();
}

// Add a window resize event listener
window.addEventListener('resize', resizeBoard);


function updateStatus() {
    var status = ''
    var moveColor = 'White'
    if (game.turn() === 'b') {
        moveColor = 'Black'
    }

    if (game.isCheckmate()) {
        status = 'Game over, ' + moveColor + ' is in checkmate.'
    } else if (game.isDraw()) {
        status = 'Game over, drawn position'
    } else {
        status = moveColor + ' to move'
        if (game.isCheck()) {
            status += ', ' + moveColor + ' is in check'
        }
    }

    $status.html(status)
    $fen.html(game.fen())
    $pgn.html(game.pgn())
}

$('#submitUsername').click(function() {
  var username = $('#username').val();
  if (username) {
      startLoadingPositions(username);
  } else {
      alert("Please enter a username");
  }
});


$('#loadPosition').click(function() {
  var username = $('#username').val();  // Assuming you still have a username input
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
resizeBoard();
updateStatus()