// Initialize the chessboard
var board = Chessboard('board', {
    draggable: true,
    dropOffBoard: 'trash',
    sparePieces: true,
    pieceTheme: 'node_modules/@chrisoakman/chessboardjs/dist/img/chesspieces/wikipedia/{piece}.png'
});

// Function to load a position from the API
function loadPosition() {
    $.ajax({
        url: 'https://api.chess.com/pub/puzzle/random', // Example API endpoint
        method: 'GET',
        success: function(response) {
            // Assuming the API returns a FEN string in the "fen" field
            var fen = response.fen;
            board.position(fen);
        },
        error: function(error) {
            console.error('Error fetching position:', error);
        }
    });
}

// Attach event listener to the button
document.getElementById('loadPosition').addEventListener('click', loadPosition);
