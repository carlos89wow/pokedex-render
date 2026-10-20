
// =============================================
// PROYECTO POKEDEX - CRUD CON SQLITE3
// =============================================

// Importamos las librerias necesarias
const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

// Creamos el servidor
const app = express();
const PORT = process.env.PORT || 3000;

// Permitimos conexiones y datos en formato JSON
app.use(cors());
app.use(express.json());
// Indicamos dónde se encuentran los archivos de nuestra Pokédex
const carpetaCliente = path.join(__dirname, "../cliente");

// Permitimos que Express muestre el HTML, CSS y JavaScript
app.use(express.static(carpetaCliente));

// Definimos las rutas de nuestros archivos
const archivoJSON = path.join(__dirname, "comentarios.json");
const archivoBD = path.join(__dirname, "comentarios.db");

// Abrimos o creamos la base de datos SQLite
const db = new sqlite3.Database(archivoBD, (error) => {
    if (error) {
        console.error("Error al abrir SQLite:", error.message);
    } else {
        console.log("Base de datos SQLite abierta correctamente.");
    }
});

// =============================================
// CREAR TABLA Y RECUPERAR DATOS ANTERIORES
// =============================================

// Creamos la tabla si todavia no existe
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS comentarios (
            id TEXT PRIMARY KEY NOT NULL,
            pokemon TEXT NOT NULL,
            nombre TEXT NOT NULL,
            texto TEXT NOT NULL,
            fecha TEXT NOT NULL
        )
    `, (error) => {
        if (error) {
            console.error("Error al crear la tabla:", error.message);
            return;
        }

        console.log("Tabla de comentarios preparada.");

        // Recuperamos los comentarios del archivo anterior
        //migrarComentarios();
    });
});

// Esta funcion copia los comentarios JSON a SQLite
function migrarComentarios() {

    // Verificamos si existe el archivo anterior
    if (!fs.existsSync(archivoJSON)) {
        return;
    }

    let comentarios;

    try {
        // Leemos los comentarios guardados anteriormente
        comentarios = JSON.parse(
            fs.readFileSync(archivoJSON, "utf8")
        );
    } catch (error) {
        console.error("Error al leer comentarios.json:", error.message);
        return;
    }

    // Comprobamos que el contenido sea una lista
    if (!Array.isArray(comentarios)) {
        console.error("El archivo JSON no contiene una lista.");
        return;
    }

    // Insertamos cada comentario sin duplicar registros
    const sql = `
        INSERT OR IGNORE INTO comentarios
        (id, pokemon, nombre, texto, fecha)
        VALUES (?, ?, ?, ?, ?)
    `;

    const insertar = db.prepare(sql, (error) => {
        if (error) {
            console.error("Error al preparar migracion:", error.message);
            return;
        }

        comentarios.forEach((comentario) => {

            // Conservamos los identificadores originales
            const id = String(comentario.id);
            const pokemon = String(comentario.pokemon);
            const nombre = String(comentario.nombre);
            const texto = String(comentario.texto);

            // Los comentarios anteriores no tenian fecha
            const fecha = comentario.fecha || "Fecha no registrada";

            insertar.run(
                id, pokemon, nombre, texto, fecha,
                (error) => {
                    if (error) {
                        console.error("Error al migrar:", error.message);
                    }
                }
            );
        });

        insertar.finalize((error) => {
            if (error) {
                console.error("Error al finalizar migracion:", error.message);
            } else {
                console.log("Migracion inicial de comentarios terminada.");
            }
        });
    });
}

// =============================================
// READ - CONSULTAR COMENTARIOS
// =============================================

// GET permite consultar comentarios de un Pokemon
app.get("/api/comentarios", (req, res) => {

    // Obtenemos el Pokemon solicitado
    const pokemon = String(req.query.pokemon || "")
        .toLowerCase()
        .trim();

    // Consultamos los registros mediante SQL
    const sql = `
        SELECT id, pokemon, nombre, texto, fecha
        FROM comentarios
        WHERE pokemon = ?
        ORDER BY rowid ASC
    `;

    db.all(sql, [pokemon], (error, filas) => {

        if (error) {
            return res.status(500).json({
                error: "Error al consultar comentarios"
            });
        }

        // Devolvemos los comentarios encontrados
        res.json(filas);
    });
});

// =============================================
// CREATE - PUBLICAR COMENTARIO
// =============================================

// POST permite guardar un nuevo comentario
app.post("/api/comentarios", (req, res) => {

    // Recibimos los datos del formulario
    const pokemon = String(req.body.pokemon || "")
        .toLowerCase()
        .trim();

    const nombre = String(req.body.nombre || "").trim();
    const texto = String(req.body.texto || "").trim();

    // Validamos que los campos tengan informacion
    if (!pokemon || !nombre || !texto) {
        return res.status(400).json({
            error: "Todos los campos son obligatorios"
        });
    }

    // Generamos un identificador unico
    const id = require("crypto").randomUUID();

    // Registramos la fecha automaticamente
    const fecha = new Date().toISOString();

    // Preparamos la instruccion SQL
    const sql = `
        INSERT INTO comentarios
        (id, pokemon, nombre, texto, fecha)
        VALUES (?, ?, ?, ?, ?)
    `;

    // Guardamos el comentario en SQLite
    db.run(sql, [id, pokemon, nombre, texto, fecha], (error) => {

        if (error) {
            return res.status(500).json({
                error: "Error al guardar comentario"
            });
        }

        // Respondemos con el comentario creado
        res.status(201).json({
            id,
            pokemon,
            nombre,
            texto,
            fecha
        });
    });
});

// =============================================
// UPDATE - MODIFICAR COMENTARIO
// =============================================

// PUT permite modificar un comentario existente
app.put("/api/comentarios/:id", (req, res) => {

    // Obtenemos el identificador del comentario
    const id = req.params.id;

    // Recibimos el nuevo texto
    const texto = String(req.body.texto || "").trim();

    // Validamos que no este vacio
    if (!texto) {
        return res.status(400).json({
            error: "El comentario no puede estar vacio"
        });
    }

    // Actualizamos el registro mediante SQL
    const sql = `
        UPDATE comentarios
        SET texto = ?
        WHERE id = ?
    `;

    db.run(sql, [texto, id], function(error) {

        if (error) {
            return res.status(500).json({
                error: "Error al actualizar comentario"
            });
        }

        // Comprobamos si encontramos el comentario
        if (this.changes === 0) {
            return res.status(404).json({
                error: "Comentario no encontrado"
            });
        }

        // Consultamos el comentario actualizado
        db.get(
            "SELECT * FROM comentarios WHERE id = ?",
            [id],
            (error, comentario) => {

                if (error) {
                    return res.status(500).json({
                        error: "Error al consultar comentario actualizado"
                    });
                }

                res.json(comentario);
            }
        );
    });
});

// =============================================
// DELETE - ELIMINAR COMENTARIO
// =============================================

// DELETE permite borrar un comentario por su ID
app.delete("/api/comentarios/:id", (req, res) => {

    // Obtenemos el identificador solicitado
    const id = req.params.id;

    // Ejecutamos la instruccion SQL
    const sql = `
        DELETE FROM comentarios
        WHERE id = ?
    `;

    db.run(sql, [id], function(error) {

        if (error) {
            return res.status(500).json({
                error: "Error al eliminar comentario"
            });
        }

        // Verificamos que se haya eliminado un registro
        if (this.changes === 0) {
            return res.status(404).json({
                error: "Comentario no encontrado"
            });
        }

        // Confirmamos la eliminacion
        res.json({
            mensaje: "Comentario eliminado correctamente"
        });
    });
});

// =============================================
// INICIAR SERVIDOR
// =============================================

// Iniciamos nuestro servidor en el puerto 3000
app.listen(PORT, () => {
    console.log(
        `Servidor funcionando en http://localhost:${PORT}`
    );
});
