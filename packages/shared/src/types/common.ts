/** Identifiant unique d'un joueur dans une room (nanoid). */
export type PlayerId = string;

/** Identifiant unique d'une room (uuid via nanoid). */
export type RoomId = string;

/** Code mémorisable lettres, format `MOT-MOT` (ex: "BLUE-CAT"). */
export type RoomCode = string;

/** Identifiant socket.io. */
export type SocketId = string;
