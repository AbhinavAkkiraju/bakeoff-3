const serverURL = "https://movies.cmu-dhcs.workers.dev/";
class Trial {
    constructor(teamName, testMovies, verbose) {
        this.events = {};
        this.submitted = false;
        this.seed = 0;
        this.quantity = 50;
        this.verbose = true;
        console.log("%c DHCS S26 Section D Bakeoff 3 Judge v1 ", "color: black; padding:3px; border-radius:3px; font-size: 14px; font-weight: bold; background: linear-gradient(90deg, #B4EA5E 0%, #9CD18D 20%, #84B9BB 30%, #6CA0EA 45%, #9998E2 60%, #C78FDB 80%, #F487D3 100%);");
        if (teamName == "teamName" || typeof teamName == "undefined") {
            console.warn("You must supply a team name (and it shouldn't be 'teamName').");
        }
        this.teamName = teamName;
        if (typeof testMovies !== "undefined") {
            this.movies = testMovies;
        }
    }
    validateData(userData) {
        let dataIsValid = true;
        if (!userData.movieTime) {
            console.warn("No movieTime provided in submitted user data.");
            dataIsValid = false;
        }
        if (!userData.numberOfTickets) {
            console.warn("No numberOfTickets provided in submitted user data.");
            dataIsValid = false;
        }
        else if (typeof userData.numberOfTickets != "number") {
            console.warn("numberOfTickets must be submitted *as a number*. (You are submitting it as a " + typeof userData.numberOfTickets + ".)");
            dataIsValid = false;
        }
        if (!userData.userName) {
            console.warn("No userName provided in submitted user data.");
            dataIsValid = false;
        }
        if (!userData.movie || !userData.movie.title || !userData.movie.genres || !userData.movie.actors || !userData.movie.movieLength) {
            console.warn("No movie provided (or: it is lacking title, genres, actors, or movieLength data) in submitted user data.");
            dataIsValid = false;
        }
        if (dataIsValid == true)
            return true;
        else {
            console.log(`Submitted data should be of the form: 
{
	movie: { // this whole "movie" sub-object should be the same as one of the movies from the movie list you were given (don't change anything within this block)
		title: string,
		movieTimes: Array<string>, // because you don't change anything in this 'movie' sub-object, this is still *all* of the movieTimes for this movie -- the user's selected time is below
		movieLength: number,
		genres: Array<string>,
		description: string,
		actors: Array<string>
	}, 
	movieTime: string, // this should be a single time, in "HH:mm" format (such as "17:15" or "13:21")
	numberOfTickets: number, 
	userName: string
}`);
            return false;
        }
    }
    submitMovieChoice(userData) {
        if (!this.submitted) {
            if (this.validateData(userData)) {
                let data = {
                    elapsedTime: Date.now() - this.startTime,
                    teamName: this.teamName,
                    userData: userData,
                    movieSet: {
                        seed: this.seed,
                        quantity: this.quantity
                    }
                };
                this.postToServer(data);
                this.submitted = true;
            }
            else {
                alert("Submitted data is not valid and has not been posted to the server. See your browser console for details.");
            }
        }
        else {
            console.log("Already submitted.");
        }
    }
    // send trial data to the scoring server
    postToServer(data) {
        if (this.verbose)
            console.log("Sending to server.");
        fetch(serverURL + "report", {
            method: "POST",
            mode: "cors",
            headers: {
                'Accept': 'application/json',
                'Content-Type': "application/json"
            },
            body: JSON.stringify(data)
        })
            .then(response => {
            return response.json();
        })
            .then(json => {
            data.result = json;
            if (this.verbose)
                console.log("Received from server.");
            // post to the console in case Cloudflare's DBs are down... again...
            console.log(JSON.stringify(data));
        })
            .catch((error) => {
            console.error('Server error:', error);
            // and if there's a server error, at least post everything else to the console.
            console.log(JSON.stringify(data));
        });
    }
    async getMovies() {
        if (typeof this.movies !== "undefined") {
            this.startTime = Date.now();
            return this.movies;
        }
        let data = await fetch(serverURL + "moviedata.json", {
            method: "GET",
            mode: "cors",
            headers: {
                'Accept': 'application/json',
                'Content-Type': "application/json"
            }
        })
            .then(response => {
            return response.json(); // parse the json
        })
            .then(json => {
            if (this.verbose)
                console.log("Received from server:", json);
            return json; // returning here returns it to the "data" variable from 13 lines ago
        })
            .catch((error) => {
            console.error('Server error:', error);
            return testMovies;
        });
        this.seed = data.seed; // store this stuff so we can give it back to the server later for scoring
        this.quantity = data.quantity; // quantity is not exactly the same as movies.length (it's a number to aim for *after* the required user profiles are catered to, so movies.length ends up as max(quantity, users.length)
        this.movies = data.movies;
        this.startTime = Date.now(); // now that movies are available, start the trial clock ticking
        return data.movies;
    }
}
