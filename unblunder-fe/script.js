import { Chess } from '/node_modules/chess.js/dist/esm/chess.js'
import { onDragStart, onDrop, onSnapEnd, updateStatus } from './chessEvents.js'

var board = null
var game = new Chess()
var $status = $('#status')
var $fen = $('#fen')
var $pgn = $('#pgn')

const updateStatusFn = updateStatus(game, $status, $fen, $pgn);

function loadPosition() {
  $.ajax({
    url: 'https://api.chess.com/pub/puzzle/random', // Example API endpoint
    method: 'GET',
    // contentType: 'application/json',
    // data: JSON.stringify({ player_id: username }),
      success: function(response) {
          // Assuming the API returns a FEN string in the "fen" field
          var fen = response.fen;
          board.position(fen);
          game.load(fen);  // Update the game state
          updateStatusFn();  // Update the status display
      },
      error: function(error) {
          console.error('Error fetching position:', error);
      }
  });
}

// Attach event listener to the button
document.getElementById('loadPosition').addEventListener('click', loadPosition);

// document.getElementById('submitUsername').addEventListener('click', function() {
//   var username = document.getElementById('username').value;
//   loadPosition(username);
// });

var config = {
  draggable: true,
  position: 'start',
  pieceTheme: 'node_modules/@chrisoakman/chessboardjs/dist/img/chesspieces/wikipedia/{piece}.png',
  onDragStart: onDragStart(game),
  onDrop: onDrop(game, updateStatusFn),
  onSnapEnd: function() { onSnapEnd(game, board)(); }
}

board = Chessboard('myBoard', config)

updateStatusFn()
