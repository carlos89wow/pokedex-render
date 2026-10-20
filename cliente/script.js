
const botonBuscar = document.getElementById("buscar");
const inputPokemon = document.getElementById("pokemon");
const resultado = document.getElementById("resultado");
const cartas = document.getElementById("cartas");
const videojuegos = document.getElementById("videojuegos");

// API 4 - Comentarios
const listaComentarios = document.getElementById("lista-comentarios");
const pokemonComentarios = document.getElementById("pokemon-comentarios");
const formularioComentario = document.getElementById("form-comentario");
const nombreEntrenador = document.getElementById("nombre-entrenador");
const textoComentario = document.getElementById("texto-comentario");

// Ruta de comentarios compatible con nuestra computadora y Render
const API_COMENTARIOS = "/api/comentarios";

let pokemonActual = null;
let busquedaActual = 0;

botonBuscar.addEventListener("click", buscarPokemon);


// API 1 - PokéAPI
function buscarPokemon() {

    const pokemon = inputPokemon.value.toLowerCase().trim();

    if (pokemon === "") {
        resultado.innerHTML = "<p>Escribe el nombre de un Pokémon.</p>";
        return;
    }

    const busqueda = ++busquedaActual;

    pokemonActual = null;
    listaComentarios.textContent = "";
    pokemonComentarios.textContent = "Buscando Pokémon...";

    fetch(`https://pokeapi.co/api/v2/pokemon/${pokemon}`)
        .then(response => {

            if (!response.ok) {
                throw new Error("Pokémon no encontrado");
            }

            return response.json();
        })
        .then(data => {

            if (busqueda !== busquedaActual) return;

            const tipos = data.types
                .map(tipo => tipo.type.name)
                .join(", ");

            resultado.innerHTML = `
                <h2>${data.name}</h2>

                <img
                    src="${data.sprites.front_default}"
                    alt="${data.name}"
                >

                <p><strong>Tipo:</strong> ${tipos}</p>
                <p><strong>Altura:</strong> ${data.height / 10} m</p>
                <p><strong>Peso:</strong> ${data.weight / 10} kg</p>

                <h3>Ataques por nivel - Pokémon FireRed</h3>

                <table>
                    <thead>
                        <tr>
                            <th>Nivel</th>
                            <th>Ataque</th>
                        </tr>
                    </thead>

                    <tbody id="tablaAtaques"></tbody>
                </table>
            `;

            mostrarAtaquesFireRed(data.moves);

            // API 2 - Cartas
            buscarCartas(data.name);

            // API 3 - Combate
            buscarCombate(data.name);

            // API 4 - Comentarios
            pokemonActual = data.name;

            pokemonComentarios.textContent =
                `Comentarios sobre ${formatearNombre(data.name)}`;

            cargarComentarios(data.name);

        })
        .catch(error => {

            if (busqueda !== busquedaActual) return;

            resultado.innerHTML =
                "<p>Pokémon no encontrado.</p>";

            cartas.innerHTML = "";
            videojuegos.innerHTML = "";

            pokemonActual = null;

            pokemonComentarios.textContent =
                "Busca un Pokémon para ver sus comentarios.";

            listaComentarios.textContent = "";

            console.error(error);
        });
}


// Ataques de FireRed
function mostrarAtaquesFireRed(movimientos) {

    const tablaAtaques = document.getElementById("tablaAtaques");
    const ataquesFireRed = [];

    movimientos.forEach(movimiento => {

        movimiento.version_group_details.forEach(detalle => {

            if (
                detalle.version_group.name === "firered-leafgreen" &&
                detalle.move_learn_method.name === "level-up"
            ) {

                ataquesFireRed.push({
                    nivel: detalle.level_learned_at,
                    ataque: movimiento.move.name
                });
            }
        });
    });

    ataquesFireRed.sort((a, b) => a.nivel - b.nivel);

    if (ataquesFireRed.length === 0) {

        tablaAtaques.innerHTML = `
            <tr>
                <td colspan="2">
                    No hay información de ataques por nivel
                    para este Pokémon en FireRed / LeafGreen.
                </td>
            </tr>
        `;

        return;
    }

    tablaAtaques.innerHTML = "";

    ataquesFireRed.forEach(ataque => {

        tablaAtaques.innerHTML += `
            <tr>
                <td>${ataque.nivel}</td>
                <td>${formatearNombre(ataque.ataque)}</td>
            </tr>
        `;
    });
}


// API 2 - TCGdex
function buscarCartas(nombrePokemon) {

    fetch(`https://api.tcgdex.net/v2/en/cards?name=${nombrePokemon}`)
        .then(response => response.json())
        .then(data => {

            cartas.innerHTML = "";

            const cincoCartas = data.slice(0, 5);

            cincoCartas.forEach(carta => {

                cartas.innerHTML += `
                    <div>
                        <img
                            src="${carta.image}/high.webp"
                            alt="${carta.name}"
                            width="180"
                        >

                        <p>
                            <strong>${carta.name}</strong>
                        </p>
                    </div>
                `;
            });
        })
        .catch(error => {

            cartas.innerHTML =
                "<p>No se pudieron cargar las cartas.</p>";

            console.error(error);
        });
}


// API 3 - Pokémon Showdown
function buscarCombate(nombrePokemon) {

    fetch("https://play.pokemonshowdown.com/data/pokedex.json")
        .then(response => response.json())
        .then(data => {

            const nombre = nombrePokemon
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "");

            const pokemon = data[nombre];

            if (!pokemon) {

                videojuegos.innerHTML =
                    "<p>No se encontró información de combate.</p>";

                return;
            }

            videojuegos.innerHTML = `
                <p><strong>HP:</strong>
                    ${pokemon.baseStats.hp}
                </p>

                <p><strong>Ataque:</strong>
                    ${pokemon.baseStats.atk}
                </p>

                <p><strong>Defensa:</strong>
                    ${pokemon.baseStats.def}
                </p>

                <p><strong>Ataque especial:</strong>
                    ${pokemon.baseStats.spa}
                </p>

                <p><strong>Defensa especial:</strong>
                    ${pokemon.baseStats.spd}
                </p>

                <p><strong>Velocidad:</strong>
                    ${pokemon.baseStats.spe}
                </p>

                <p>
                    <strong>Habilidades:</strong>
                    ${Object.values(pokemon.abilities).join(", ")}
                </p>
            `;
        })
        .catch(error => {

            videojuegos.innerHTML =
                "<p>No se pudo cargar la información de combate.</p>";

            console.error(error);
        });
}


// Formatear nombres
function formatearNombre(nombre) {

    return nombre
        .split("-")
        .map(palabra =>
            palabra.charAt(0).toUpperCase() + palabra.slice(1)
        )
        .join(" ");
}


// API 4 - CRUD DE COMENTARIOS

// Función general para comunicarse con el servidor
async function peticionComentarios(url, opciones) {

    const respuesta = await fetch(url, opciones);

    if (!respuesta.ok) {

        let detalle = "Error al comunicarse con el servidor";

        try {
            const datos = await respuesta.json();
            detalle = datos.error || detalle;
        } catch (error) {
            console.error(error);
        }

        throw new Error(detalle);
    }

    if (respuesta.status === 204) return null;

    return respuesta.json();
}


// READ - Consultar comentarios
async function cargarComentarios(pokemon = pokemonActual) {

    if (!pokemon) return;

    listaComentarios.textContent = "Cargando comentarios...";

    try {

        const comentarios = await peticionComentarios(
            `${API_COMENTARIOS}?pokemon=${encodeURIComponent(pokemon)}`
        );

        if (pokemonActual !== pokemon) return;

        listaComentarios.replaceChildren();

        if (comentarios.length === 0) {

            listaComentarios.textContent =
                "Todavía no hay comentarios para este Pokémon.";

            return;
        }

        comentarios.forEach(comentario => {

            const tarjeta = document.createElement("div");
            tarjeta.className = "comentario";

            const autor = document.createElement("strong");
            autor.textContent = comentario.nombre;

            const mensaje = document.createElement("p");
            mensaje.textContent = comentario.texto;

            const editar = document.createElement("button");
            editar.type = "button";
            editar.textContent = "Editar";

            editar.addEventListener("click", () => {
                editarComentario(comentario);
            });

            const eliminar = document.createElement("button");
            eliminar.type = "button";
            eliminar.textContent = "Eliminar";

            eliminar.addEventListener("click", () => {
                eliminarComentario(comentario);
            });

            tarjeta.append(autor, mensaje, editar, eliminar);

            listaComentarios.append(tarjeta);
        });

    } catch (error) {

        if (pokemonActual === pokemon) {
            listaComentarios.textContent =
                `No se pudieron cargar los comentarios: ${error.message}`;
        }
    }
}


// CREATE - Publicar comentario
formularioComentario.addEventListener("submit", async (evento) => {

    evento.preventDefault();

    const pokemon = pokemonActual;

    if (!pokemon) {
        alert("Primero busca un Pokémon.");
        return;
    }

    const nombre = nombreEntrenador.value.trim();
    const texto = textoComentario.value.trim();

    if (!nombre || !texto) return;

    try {

        await peticionComentarios(API_COMENTARIOS, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                pokemon,
                nombre,
                texto
            })
        });

        formularioComentario.reset();

        if (pokemonActual === pokemon) {
            await cargarComentarios(pokemon);
        }

    } catch (error) {

        alert(`No se pudo publicar: ${error.message}`);
    }
});


// UPDATE - Editar comentario
async function editarComentario(comentario) {

    const texto = prompt(
        "Modifica tu comentario:",
        comentario.texto
    );

    if (texto === null || !texto.trim()) return;

    try {

        await peticionComentarios(
            `${API_COMENTARIOS}/${encodeURIComponent(comentario.id)}`,
            {
                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    texto: texto.trim()
                })
            }
        );

        await cargarComentarios();

    } catch (error) {

        alert(`No se pudo editar: ${error.message}`);
    }
}


// DELETE - Eliminar comentario
async function eliminarComentario(comentario) {

    if (!confirm("¿Eliminar este comentario?")) return;

    try {

        await peticionComentarios(
            `${API_COMENTARIOS}/${encodeURIComponent(comentario.id)}`,
            {
                method: "DELETE"
            }
        );

        await cargarComentarios();

    } catch (error) {

        alert(`No se pudo eliminar: ${error.message}`);
    }
}
