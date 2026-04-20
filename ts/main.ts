/// <reference path="framework.ts" />

// As always, we add our parts within a "load" event to make sure the HTML stuff has loaded first. 
window.addEventListener("load", (e: Event) => {
	// Get references to the HTML elements that we need.
	const titleSelect = document.getElementById("titleSelect") as HTMLSelectElement;
	const timeSelect = document.getElementById("timeSelect") as HTMLSelectElement;
	const submitButton = document.getElementById("submit") as HTMLButtonElement;
	const numberOfTicketsTextBox = document.getElementById("numberOfTickets") as HTMLInputElement;
	const userNameTextBox = document.getElementById("userName") as HTMLInputElement;

	const movieInfoDiv = document.getElementById("movieInfo") as HTMLDivElement;

	
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
	const movies : Array<movieData> = trial.getMovies();

	// Variable to store the current movie selection.
	let currentlySelectedMovie : movieData;

	// for every movie in the list, add it to the movie selector dropdown
	for (let i = 0; i<movies.length; i++) {
		const movie : movieData = movies[i];
		const opt : HTMLOptionElement = document.createElement("option");
		opt.innerText = movie.title; // for a dropdown menu, the "innerText" will be what is displayed to the user...
		opt.value = i+""; // ...and the "value" is another bit of data we can associate with it. In this case, we'll store the index of the movie in the movie list, so we can use it to retrieve the movie data later.
		titleSelect.appendChild(opt);
	}

	// ...and then update the rest of the display with the info about the first movie on the list, which will be the default option selected.
	selectMovie(movies[0]);

	// Whenever a new item is chosen from the list, update the view
	titleSelect.addEventListener("change", (event : Event)  => {
		selectMovie(movies[titleSelect.value]);
	});

	function selectMovie(movie: movieData) {
		// set the currentlySelectedMovie to this one
		currentlySelectedMovie = movie;

		// update the display
		displayMovieDetails(movie);
		displayShowtimes(movie);
	}

	// Function to generate HTML elements containing title, details, etc for the movie to be displayed
	function displayMovieDetails(movie : movieData) {
		// clear anything that's currently in there out
		movieInfoDiv.innerHTML = ''; 

		// ...then make new elements
		const titleBar = document.createElement("H2");
		titleBar.innerText = movie.title;
		const details = document.createElement("div");

		const description = document.createElement("p");
		description.innerText = movie.description;
		details.appendChild(description);

		const tags = document.createElement("p");
		tags.innerText = "Tags: "+movie.genres.join(", ");
		details.appendChild(tags);

		const actors = document.createElement("p");
		actors.innerText = "Starring: "+movie.actors.join(", ");
		details.appendChild(actors);

		movieInfoDiv.appendChild(titleBar);
		movieInfoDiv.appendChild(details);
	}

	// Function that puts the showtimes of the given movie into the showtime dropdown list.
	function displayShowtimes(movie : movieData) {
		timeSelect.innerHTML = '';
		for (let i = 0; i<movie.movieTimes.length; i++) {
			const t = movie.movieTimes[i];
			const opt = document.createElement("option");
			opt.innerText = t;
			opt.value = t;
			timeSelect.appendChild(opt);
		}
	}

	// When the user clicks the submit button, 
	submitButton.addEventListener("click", (event) => {
		// bundle up everything the Judge wants to see: the movie [a full movie object with all the metadata], the movieTime, the numberOfTickets (*as a number*), and the userName
		const userData : userData = {
			movie: currentlySelectedMovie, // this should be the entire "movie" object, as described in lines 17-24 above
			movieTime: timeSelect.value,  // a string
			numberOfTickets: parseInt(numberOfTicketsTextBox.value), // a number
			userName: userNameTextBox.value // a string
		};
		// ...and submit it to the Judge. 
		// ===> Your code *must*, somewhere/somehow, call this: <===
		trial.submitMovieChoice(userData);
	});	

});
