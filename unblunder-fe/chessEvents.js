// chessEvents.js
export function onDragStart(game) {
    return function(source, piece, position, orientation) {
        // do not pick up pieces if the game is over
        if (game.isGameOver()) return false;

        // only pick up pieces for the side to move
        if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
            (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
        }
    }
    }

export function onSnapEnd(game, board) {
    return function() {
        board.position(game.fen());
    }
}

