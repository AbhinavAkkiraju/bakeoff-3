// As always, we add our parts within a "load" event to make sure the HTML stuff has loaded first.
window.addEventListener("load", () => {
    const trial = new Trial("teamName");
    // getMovies is a function defined by the framework script. It will return a list of movies (in no guaranteed order). Each movie will be an object shaped like this:
    // {
    // 		title: string,
    // 		movieTimes: list of movie start times, represented as a 24-hour time string (https://developer.mozilla.org/en-US/docs/Web/HTML/Date_and_time_formats#time_strings) like "16:00",
    //  	movieLength: number (in minutes),
    // 		genres: list of strings,
    //  	description: string,
    //  	actors: list of strings
    // 	}
    const movies = trial.getMovies();

    // convert "HH:MM" string to minutes since midnight
    function timeStrToMin(t) {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
    }

    // convert minutes to readable 12-hour time like "4:30 PM"
    function minToTime12(min) {
        const h = Math.floor(min / 60);
        const m = min % 60;
        const ampm = h < 12 ? "AM" : "PM";
        const h12 = h === 0 ? 12 : (h > 12 ? h - 12 : h);
        return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
    }

    function capitalize(s) { return s[0].toUpperCase() + s.slice(1); }

    // compute slider range from actual movie data so it covers everything
    const allStartMins = movies.flatMap(m => m.movieTimes.map(timeStrToMin));
    const allEndMins = movies.flatMap(m => m.movieTimes.map(t => timeStrToMin(t) + m.movieLength));
    const SMIN = Math.floor(Math.min(...allStartMins) / 30) * 30;
    const SMAX = Math.ceil(Math.max(...allEndMins) / 30) * 30;

    // app state — single source of truth for all three screens
    const state = {
        includeGenre: "",
        excludeGenre: "",
        startMin: SMIN,
        endMin: SMAX,
        clearEnd: false,
        selectedMovie: null,
        selectedShowtime: null
    };

    const allGenres = [...new Set(movies.flatMap(m => m.genres))].sort();

    // fill a <select> with genre options
    function fillGenreSelect(sel, emptyLabel) {
        sel.innerHTML = `<option value="">${emptyLabel}</option>`;
        allGenres.forEach(g => {
            const o = document.createElement("option");
            o.value = g;
            o.textContent = capitalize(g);
            sel.appendChild(o);
        });
    }

    // which showtimes for a movie are within the current time window
    // "done by endMin" means start + movie length <= endMin
    function getValidShowtimes(movie) {
        return movie.movieTimes.filter(t => {
            const tMin = timeStrToMin(t);
            if (tMin < state.startMin) return false;
            if (!state.clearEnd && tMin + movie.movieLength > state.endMin) return false;
            return true;
        });
    }

    // movies that pass genre filters AND have at least one valid showtime
    function getFilteredMovies() {
        return movies.filter(m => {
            if (state.includeGenre && !m.genres.includes(state.includeGenre)) return false;
            if (state.excludeGenre && m.genres.includes(state.excludeGenre)) return false;
            return getValidShowtimes(m).length > 0;
        });
    }

    // build genre-tag spans and append to a container
    function appendGenreTags(container, movie) {
        const wrap = document.createElement("div");
        wrap.className = "genre-tags";
        movie.genres.forEach(g => {
            const span = document.createElement("span");
            span.className = "genre-tag";
            span.textContent = capitalize(g);
            wrap.appendChild(span);
        });
        container.appendChild(wrap);
    }


    // ---- screen 1 setup ----

    const s1Inc = document.getElementById("s1Include");
    const s1Exc = document.getElementById("s1Exclude");
    const s1Any = document.getElementById("s1Any");
    const s1StartR = document.getElementById("s1Start");
    const s1EndR = document.getElementById("s1End");
    const s1StartL = document.getElementById("s1StartLabel");
    const s1EndL = document.getElementById("s1EndLabel");
    const s1ClearEnd = document.getElementById("s1ClearEnd");
    const s1Fill = document.getElementById("s1Fill");

    fillGenreSelect(s1Inc, "-- Any --");
    fillGenreSelect(s1Exc, "-- None --");

    // set slider min/max from computed range
    [s1StartR, s1EndR].forEach(r => { r.min = SMIN; r.max = SMAX; });
    s1StartR.value = SMIN;
    s1EndR.value = SMAX;

    // position a time-label bubble over the thumb at the given value
    function posLabel(el, val) {
        const pct = (val - SMIN) / (SMAX - SMIN);
        // formula accounts for thumb diameter (~20px) so label stays centered over thumb
        el.style.left = `calc(${pct * 100}% + ${(0.5 - pct) * 20}px)`;
        el.textContent = minToTime12(val);
    }

    function syncSliders() {
        let sv = parseInt(s1StartR.value);
        let ev = parseInt(s1EndR.value);
        // prevent handles from crossing each other
        if (sv > ev) {
            if (document.activeElement === s1StartR) { s1StartR.value = ev; sv = ev; }
            else { s1EndR.value = sv; ev = sv; }
        }
        state.startMin = sv;
        state.endMin = ev;

        posLabel(s1StartL, sv);
        if (state.clearEnd) {
            s1EndL.style.visibility = "hidden";
        } else {
            s1EndL.style.visibility = "";
            posLabel(s1EndL, ev);
        }

        // update the blue filled segment between the two thumbs
        const startPct = (sv - SMIN) / (SMAX - SMIN) * 100;
        const endPct = (ev - SMIN) / (SMAX - SMIN) * 100;
        s1Fill.style.left = startPct + "%";
        s1Fill.style.width = (endPct - startPct) + "%";
    }

    s1StartR.addEventListener("input", syncSliders);
    s1EndR.addEventListener("input", syncSliders);

    s1Any.addEventListener("change", () => {
        s1Inc.disabled = s1Any.checked;
        if (s1Any.checked) s1Inc.value = "";
    });

    s1ClearEnd.addEventListener("change", () => {
        state.clearEnd = s1ClearEnd.checked;
        s1EndR.disabled = state.clearEnd;
        syncSliders();
    });

    document.getElementById("nextBtn").addEventListener("click", () => {
        state.includeGenre = s1Any.checked ? "" : s1Inc.value;
        state.excludeGenre = s1Exc.value;
        showScreen(2);
    });

    syncSliders(); // draw initial state


    // ---- screen 2 setup ----

    const s2Inc = document.getElementById("s2Include");
    const s2Exc = document.getElementById("s2Exclude");
    const movieListEl = document.getElementById("movieList");

    // screen 2 slider elements
    const s2StartR = document.getElementById("s2Start");
    const s2EndR = document.getElementById("s2End");
    const s2StartL = document.getElementById("s2StartLabel");
    const s2EndL = document.getElementById("s2EndLabel");
    const s2ClearEnd = document.getElementById("s2ClearEnd");
    const s2Fill = document.getElementById("s2Fill");

    fillGenreSelect(s2Inc, "Any");
    fillGenreSelect(s2Exc, "None");

    // set slider range (same as screen 1)
    [s2StartR, s2EndR].forEach(r => { r.min = SMIN; r.max = SMAX; });

    // changing filters on screen 2 updates state and re-renders list live
    s2Inc.addEventListener("change", () => { state.includeGenre = s2Inc.value; renderMovieList(); });
    s2Exc.addEventListener("change", () => { state.excludeGenre = s2Exc.value; renderMovieList(); });

    // same slider sync logic as screen 1 but for s2 elements
    function syncS2Sliders() {
        let sv = parseInt(s2StartR.value);
        let ev = parseInt(s2EndR.value);
        if (sv > ev) {
            if (document.activeElement === s2StartR) { s2StartR.value = ev; sv = ev; }
            else { s2EndR.value = sv; ev = sv; }
        }
        state.startMin = sv;
        state.endMin = ev;

        posLabel(s2StartL, sv);
        if (state.clearEnd) {
            s2EndL.style.visibility = "hidden";
        } else {
            s2EndL.style.visibility = "";
            posLabel(s2EndL, ev);
        }

        const startPct = (sv - SMIN) / (SMAX - SMIN) * 100;
        const endPct = (ev - SMIN) / (SMAX - SMIN) * 100;
        s2Fill.style.left = startPct + "%";
        s2Fill.style.width = (endPct - startPct) + "%";

        renderMovieList();
    }

    s2StartR.addEventListener("input", syncS2Sliders);
    s2EndR.addEventListener("input", syncS2Sliders);

    s2ClearEnd.addEventListener("change", () => {
        state.clearEnd = s2ClearEnd.checked;
        s2EndR.disabled = state.clearEnd;
        syncS2Sliders();
    });

    function syncS2Filters() {
        s2Inc.value = state.includeGenre;
        s2Exc.value = state.excludeGenre;
        // mirror the time state onto the s2 slider
        s2StartR.value = state.startMin;
        s2EndR.value = state.endMin;
        s2ClearEnd.checked = state.clearEnd;
        s2EndR.disabled = state.clearEnd;
        syncS2Sliders();
    }

    function renderMovieList() {
        movieListEl.innerHTML = "";
        const filtered = getFilteredMovies();

        if (!filtered.length) {
            movieListEl.innerHTML = '<p class="no-results">No movies match your filters.</p>';
            return;
        }

        filtered.forEach(movie => {
            const card = document.createElement("div");
            card.className = "movie-card";

            // left column: title + genre tags
            const cardLeft = document.createElement("div");
            cardLeft.className = "card-left";
            const titleEl = document.createElement("div");
            titleEl.className = "card-title";
            titleEl.textContent = movie.title;
            cardLeft.appendChild(titleEl);
            appendGenreTags(cardLeft, movie);

            // right column: description + select button
            const cardRight = document.createElement("div");
            cardRight.className = "card-right";
            const descEl = document.createElement("p");
            descEl.className = "card-desc";
            descEl.textContent = movie.description;
            const selectBtn = document.createElement("button");
            selectBtn.className = "select-btn";
            selectBtn.textContent = "Select";
            selectBtn.addEventListener("click", () => {
                state.selectedMovie = movie;
                state.selectedShowtime = null;
                showScreen(3);
            });
            cardRight.appendChild(descEl);
            cardRight.appendChild(selectBtn);

            card.appendChild(cardLeft);
            card.appendChild(cardRight);
            movieListEl.appendChild(card);
        });
    }


    // ---- screen 3 setup ----

    const s3Info = document.getElementById("s3Info");
    const s3Times = document.getElementById("s3Times");
    const s3Name = document.getElementById("s3Name");
    const s3Tickets = document.getElementById("s3Tickets");

    function renderScreen3() {
        const movie = state.selectedMovie;

        // movie info panel: title + tags on left, description on right
        s3Info.innerHTML = "";
        const infoLeft = document.createElement("div");
        infoLeft.className = "s3-info-left";
        const h2 = document.createElement("h2");
        h2.textContent = movie.title;
        infoLeft.appendChild(h2);
        appendGenreTags(infoLeft, movie);

        const infoRight = document.createElement("div");
        infoRight.className = "s3-info-right";
        const descEl = document.createElement("p");
        descEl.textContent = movie.description;
        infoRight.appendChild(descEl);

        s3Info.appendChild(infoLeft);
        s3Info.appendChild(infoRight);

        // showtime buttons — only valid ones based on the time window
        s3Times.innerHTML = "";
        state.selectedShowtime = null;
        const valid = getValidShowtimes(movie);
        valid.forEach(t => {
            const btn = document.createElement("button");
            btn.className = "showtime-btn";
            btn.textContent = minToTime12(timeStrToMin(t));
            btn.addEventListener("click", () => {
                document.querySelectorAll(".showtime-btn").forEach(b => b.classList.remove("selected"));
                btn.classList.add("selected");
                state.selectedShowtime = t; // store raw "HH:MM" string for submission
            });
            s3Times.appendChild(btn);
        });

        // auto-select when there's only one option
        if (valid.length === 1) s3Times.querySelector(".showtime-btn").click();
    }

    document.getElementById("backBtn").addEventListener("click", () => showScreen(2));

    // When the user clicks submit,
    document.getElementById("submitBtn").addEventListener("click", () => {
        const name = s3Name.value.trim();
        const tickets = parseInt(s3Tickets.value);
        if (!state.selectedShowtime) { alert("Please select a showtime."); return; }
        if (!name) { alert("Please enter your name."); return; }
        if (!tickets || tickets < 1) { alert("Please enter a valid number of tickets."); return; }
        // bundle up everything the Judge wants to see: the movie [a full movie object with all the metadata], the movieTime, the numberOfTickets (*as a number*), and the userName
        const userData = {
            movie: state.selectedMovie,
            movieTime: state.selectedShowtime,
            numberOfTickets: tickets,
            userName: name
        };
        // ===> Your code *must*, somewhere/somehow, call this: <===
        trial.submitMovieChoice(userData);
    });


    // ---- screen switcher ----

    function showScreen(n) {
        document.getElementById("screen1").style.display = n === 1 ? "block" : "none";
        document.getElementById("screen2").style.display = n === 2 ? "block" : "none";
        document.getElementById("screen3").style.display = n === 3 ? "block" : "none";
        if (n === 2) { syncS2Filters(); renderMovieList(); }
        if (n === 3) renderScreen3();
    }

    showScreen(1);
});
