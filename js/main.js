/// <reference path="framework.ts" />
// As always, we add our parts within a "load" event to make sure the HTML stuff has loaded first.
window.addEventListener("load", async () => {
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
    const movies = await trial.getMovies();
    // convert "HH:MM" string to minutes since midnight
    function timeStrToMin(t) {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
    }
    // convert number of hours past midnight into readable 12 hour number
    // accounts for hours greater than one full day, like 25 should be 1 am
    // this is needed for some movies that start near before midnight and end after
    function getReadableHour(h) {
        if (h === 0) {
            return 12;
        } else if (h < 13) {
            return h;
        } else if (h < 24) {
            return h - 12;
        } else if (h === 24) {
            return 12;
        } else {
            return h - 24;
        }
    }

    // convert minutes to readable 12-hour time like "4:30 PM"
    function minToTime12(min) {
        const h = Math.floor(min / 60);
        const m = min % 60;
        const ampm = h < 12 ? "AM" : (h > 23 ? "AM" : "PM");
        const h12 = getReadableHour(h);
        const minutes = m < 10 ? "0" + m : m + "";
        return `${h12}:${minutes} ${ampm}`;
    }
    function capitalize(s) {
        return s[0].toUpperCase() + s.slice(1);
    }
    const allStartMins = [];
    const allEndMins = [];
    const genreSet = new Set();
    for (let i = 0; i < movies.length; i++) {
        const movie = movies[i];
        for (let j = 0; j < movie.movieTimes.length; j++) {
            const startMin = timeStrToMin(movie.movieTimes[j]);
            allStartMins.push(startMin);
            allEndMins.push(startMin + movie.movieLength);
        }
        for (let j = 0; j < movie.genres.length; j++) {
            genreSet.add(movie.genres[j]);
        }
    }
    // compute slider range from actual movie data so it covers everything
    const SMIN = Math.floor(Math.min(...allStartMins) / 30) * 30;
    const SMAX = Math.ceil(Math.max(...allEndMins) / 30) * 30;
    const allGenres = Array.from(genreSet).sort();
    // app state — single source of truth for all three screens
    const state = {
        includeGenres: [],
        excludeGenres: [],
        startMin: SMIN,
        endMin: SMAX,
        selectedMovie: null,
        selectedShowtime: null
    };
    const s1Controls = {
        includeGroup: document.getElementById("s1Include"),
        excludeGroup: document.getElementById("s1Exclude"),
        startSlider: document.getElementById("s1Start"),
        endSlider: document.getElementById("s1End"),
        startLabel: document.getElementById("s1StartLabel"),
        endLabel: document.getElementById("s1EndLabel")
    };
    const s2Controls = {
        includeGroup: document.getElementById("s2Include"),
        excludeGroup: document.getElementById("s2Exclude"),
        startSlider: document.getElementById("s2Start"),
        endSlider: document.getElementById("s2End"),
        startLabel: document.getElementById("s2StartLabel"),
        endLabel: document.getElementById("s2EndLabel")
    };
    const movieListEl = document.getElementById("movieList");
    const s3Info = document.getElementById("s3Info");
    const s3Times = document.getElementById("s3Times");
    const s3Name = document.getElementById("s3Name");
    const s3Tickets = document.getElementById("s3Tickets");
    const nextBtn = document.getElementById("nextBtn");
    const backBtn = document.getElementById("backBtn");
    const submitBtn = document.getElementById("submitBtn");
    // close all open genre dropdowns
    document.addEventListener("click", () => {
        document.querySelectorAll(".genre-panel.open").forEach(p => p.classList.remove("open"));
    });
    function updateGenreTrigger(group) {
        const triggerText = group.querySelector(".genre-trigger-text");
        if (!triggerText) return;
        const checked = getCheckedValues(group);
        if (checked.length === 0) {
            triggerText.textContent = "Filter genres...";
            triggerText.classList.add("placeholder");
        } else {
            triggerText.textContent = checked.map(capitalize).join(", ");
            triggerText.classList.remove("placeholder");
        }
    }
    // build dropdown genre selector
    function fillGenreGroup(group) {
        group.innerHTML = "";
        const trigger = document.createElement("div");
        trigger.className = "genre-trigger";
        const triggerText = document.createElement("span");
        triggerText.className = "genre-trigger-text placeholder";
        triggerText.textContent = "Select genres...";
        const arrow = document.createElement("span");
        arrow.className = "genre-arrow";
        arrow.textContent = "▾";
        trigger.appendChild(triggerText);
        trigger.appendChild(arrow);
        const panel = document.createElement("div");
        panel.className = "genre-panel";
        const search = document.createElement("input");
        search.type = "text";
        search.className = "genre-search";
        search.placeholder = "Search...";
        const list = document.createElement("div");
        list.className = "genre-list";
        for (let i = 0; i < allGenres.length; i++) {
            const genre = allGenres[i];
            const optionLabel = document.createElement("label");
            optionLabel.className = "genre-option";
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.value = genre;
            const optionText = document.createElement("span");
            optionText.textContent = capitalize(genre);
            optionLabel.appendChild(checkbox);
            optionLabel.appendChild(optionText);
            list.appendChild(optionLabel);
        }
        panel.appendChild(search);
        panel.appendChild(list);
        group.appendChild(trigger);
        group.appendChild(panel);
        trigger.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = panel.classList.contains("open");
            document.querySelectorAll(".genre-panel.open").forEach(p => p.classList.remove("open"));
            if (!isOpen) {
                panel.classList.add("open");
                search.focus();
            }
        });
        panel.addEventListener("click", (e) => e.stopPropagation());
        search.addEventListener("input", () => {
            const query = search.value.toLowerCase();
            const options = list.querySelectorAll(".genre-option");
            for (let i = 0; i < options.length; i++) {
                const text = options[i].querySelector("span").textContent.toLowerCase();
                options[i].style.display = text.includes(query) ? "" : "none";
            }
        });
    }
    function getCheckedValues(group) {
        const selectedValues = [];
        const inputs = group.querySelectorAll("input[type='checkbox']");
        for (let i = 0; i < inputs.length; i++) {
            if (inputs[i].checked) {
                selectedValues.push(inputs[i].value);
            }
        }
        return selectedValues;
    }
    function setCheckedValues(group, values) {
        const selected = new Set(values);
        const inputs = group.querySelectorAll("input[type='checkbox']");
        for (let i = 0; i < inputs.length; i++) {
            inputs[i].checked = selected.has(inputs[i].value);
        }
        updateGenreTrigger(group);
    }
    function syncFilterControls(controls) {
        setCheckedValues(controls.includeGroup, state.includeGenres);
        setCheckedValues(controls.excludeGroup, state.excludeGenres);
        controls.startSlider.min = SMIN + "";
        controls.startSlider.max = SMAX + "";
        controls.startSlider.value = state.startMin + "";
        controls.startLabel.textContent = minToTime12(state.startMin);
        controls.endSlider.min = SMIN + "";
        controls.endSlider.max = SMAX + "";
        controls.endSlider.value = state.endMin + "";
        controls.endLabel.textContent = minToTime12(state.endMin);
    }
    function syncAllFilterControls() {
        syncFilterControls(s1Controls);
        syncFilterControls(s2Controls);
    }
    function movieMatchesAnyGenre(movie, selectedGenres) {
        for (let i = 0; i < selectedGenres.length; i++) {
            if (movie.genres.indexOf(selectedGenres[i]) !== -1) {
                return true;
            }
        }
        return false;
    }
    // which showtimes for a movie are within the current time window
    // "done by endMin" means start + movie length <= endMin
    function getValidShowtimes(movie) {
        const validShowtimes = [];
        for (let i = 0; i < movie.movieTimes.length; i++) {
            const movieTime = movie.movieTimes[i];
            const startMin = timeStrToMin(movieTime);
            if (startMin < state.startMin) {
                continue;
            }
            if (startMin + movie.movieLength > state.endMin) {
                continue;
            }
            validShowtimes.push(movieTime);
        }
        return validShowtimes;
    }
    // movies that pass genre filters AND have at least one valid showtime
    function getFilteredMovies() {
        return movies.filter((movie) => {
            if (state.includeGenres.length > 0 && !movieMatchesAnyGenre(movie, state.includeGenres)) {
                return false;
            }
            if (state.excludeGenres.length > 0 && movieMatchesAnyGenre(movie, state.excludeGenres)) {
                return false;
            }
            return getValidShowtimes(movie).length > 0;
        });
    }
    // build genre-tag spans and append to a container
    function appendGenreTags(container, movie) {
        const included = new Set(state.includeGenres);
        const wrap = document.createElement("div");
        wrap.className = "genre-tags";
        for (let i = 0; i < movie.genres.length; i++) {
            const span = document.createElement("span");
            span.className = "genre-tag" + (included.has(movie.genres[i]) ? " genre-tag-match" : "");
            span.textContent = capitalize(movie.genres[i]);
            wrap.appendChild(span);
        }
        container.appendChild(wrap);
    }
    function updateGenresFromControls(controls) {
        state.includeGenres = getCheckedValues(controls.includeGroup);
        state.excludeGenres = getCheckedValues(controls.excludeGroup);
        updateGenreTrigger(controls.includeGroup);
        updateGenreTrigger(controls.excludeGroup);
        syncAllFilterControls();
        renderMovieList();
    }
    function updateStartFromControl(controls) {
        const nextStart = parseInt(controls.startSlider.value, 10);
        state.startMin = Math.min(nextStart, state.endMin);
        syncAllFilterControls();
        renderMovieList();
    }
    function updateEndFromControl(controls) {
        const nextEnd = parseInt(controls.endSlider.value, 10);
        state.endMin = Math.max(nextEnd, state.startMin);
        syncAllFilterControls();
        renderMovieList();
    }
    function renderMovieList() {
        movieListEl.innerHTML = "";
        const filteredMovies = getFilteredMovies();
        if (!filteredMovies.length) {
            movieListEl.innerHTML = '<p class="no-results">No movies match your filters.</p>';
            return;
        }
        for (let i = 0; i < filteredMovies.length; i++) {
            const movie = filteredMovies[i];
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
        }
    }
    function renderScreen3() {
        if (!state.selectedMovie) {
            return;
        }
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
        const validShowtimes = getValidShowtimes(movie);
        if (!validShowtimes.length) {
            s3Times.innerHTML = '<p class="no-results">No showtimes match your filters.</p>';
            return;
        }
        for (let i = 0; i < validShowtimes.length; i++) {
            const showtime = validShowtimes[i];
            const btn = document.createElement("button");
            btn.className = "showtime-btn";
            btn.textContent = minToTime12(timeStrToMin(showtime));
            btn.addEventListener("click", () => {
                for (let j = 0; j < s3Times.children.length; j++) {
                    s3Times.children[j].classList.remove("selected");
                }
                btn.classList.add("selected");
                state.selectedShowtime = showtime;
            });
            s3Times.appendChild(btn);
        }
        // auto-select when there's only one option
        if (validShowtimes.length === 1) {
            s3Times.querySelector(".showtime-btn").click();
        }
    }
    function showScreen(n) {
        document.getElementById("screen1").style.display = n === 1 ? "block" : "none";
        document.getElementById("screen2").style.display = n === 2 ? "block" : "none";
        document.getElementById("screen3").style.display = n === 3 ? "block" : "none";
        if (n === 2) {
            syncAllFilterControls();
            renderMovieList();
        }
        if (n === 3) {
            renderScreen3();
        }
    }
    fillGenreGroup(s1Controls.includeGroup);
    fillGenreGroup(s1Controls.excludeGroup);
    fillGenreGroup(s2Controls.includeGroup);
    fillGenreGroup(s2Controls.excludeGroup);
    syncAllFilterControls();
    s1Controls.includeGroup.addEventListener("change", () => updateGenresFromControls(s1Controls));
    s1Controls.excludeGroup.addEventListener("change", () => updateGenresFromControls(s1Controls));
    s1Controls.startSlider.addEventListener("input", () => updateStartFromControl(s1Controls));
    s1Controls.endSlider.addEventListener("input", () => updateEndFromControl(s1Controls));
    s2Controls.includeGroup.addEventListener("change", () => updateGenresFromControls(s2Controls));
    s2Controls.excludeGroup.addEventListener("change", () => updateGenresFromControls(s2Controls));
    s2Controls.startSlider.addEventListener("input", () => updateStartFromControl(s2Controls));
    s2Controls.endSlider.addEventListener("input", () => updateEndFromControl(s2Controls));
    nextBtn.addEventListener("click", () => showScreen(2));
    backBtn.addEventListener("click", () => showScreen(2));
    // When the user clicks submit,
    submitBtn.addEventListener("click", () => {
        const name = s3Name.value.trim();
        const tickets = parseInt(s3Tickets.value, 10);
        if (!state.selectedMovie) {
            alert("Please select a movie.");
            return;
        }
        if (!state.selectedShowtime) {
            alert("Please select a showtime.");
            return;
        }
        if (!name) {
            alert("Please enter your name.");
            return;
        }
        if (Number.isNaN(tickets) || tickets < 1) {
            alert("Please enter a valid number of tickets.");
            return;
        }
        // bundle up everything the Judge wants to see: the movie [a full movie object with all the metadata], the movieTime, the numberOfTickets (*as a number*), and the userName
        const userData = {
            movie: state.selectedMovie,
            movieTime: state.selectedShowtime,
            numberOfTickets: tickets,
            userName: name
        };
        // ===> Your code *must*, somewhere/somehow, call this: <===
        trial.submitMovieChoice(userData);
        submitBtn.textContent = "Submitted";
        submitBtn.classList.add("submitted");
    });
    showScreen(1);
});
