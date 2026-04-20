const testMovies = [
    {
        title: "Labyrinth",
        movieTimes: ["04:30", "16:30"],
        movieLength: 101,
        genres: ["fantasy", "musical"],
        description: "Teenage Sarah journeys through a maze to save her baby brother from the Goblin King.",
        actors: ["Jennifer Connelly", "David Bowie", "muppets"]
    },
    {
        title: "Brand Upon the Brain!",
        movieTimes: ["14:32", "18:02"],
        movieLength: 95,
        genres: ["experimental"],
        description: "Returned home to his long-estranged mother upon a request from her deathbed, a man raised by his parents in an orphanage has to confront the childhood memories that have long haunted him.",
        actors: ["Guy Maddin"]
    }, {
        title: "Tank Girl",
        movieTimes: ["04:30", "12:42"],
        movieLength: 104,
        genres: ["sci-fi", "dark comedy"],
        description: "A girl is among the few survivors of a dystopian Earth. Riding a war tank, she fights against the tyranny of a mega-corporation that dominates the remaining potable water supply of the planet.",
        actors: ["Lori Petty", "Ice-T", "Naomi Watts", "Malcolm McDowell"]
    }
];
class Trial {
    constructor(teamName) {
        this.events = {};
        this.submitted = false;
        console.log("%c DHCS S26 Section D Bakeoff 3 Judge v1 ", "color: black; padding:3px; border-radius:3px; font-size: 14px; font-weight: bold; background: linear-gradient(90deg, #B4EA5E 0%, #9CD18D 20%, #84B9BB 30%, #6CA0EA 45%, #9998E2 60%, #C78FDB 80%, #F487D3 100%);");
        if (teamName == "teamName" || typeof teamName == "undefined") {
            console.warn("You must supply a team name (and it shouldn't be 'teamName').");
        }
        this.teamName = teamName;
        this.startTime = Date.now();
    }
    submitMovieChoice(userData) {
        if (!this.submitted) {
            let data = {
                elapsedTime: Date.now() - this.startTime,
                teamName: this.teamName,
                userData: userData
            };
            if (!userData.movieTime) {
                console.warn("No movieTime provided.");
            }
            if (!userData.numberOfTickets) {
                console.warn("No numberOfTickets provided.");
            }
            else if (typeof userData.numberOfTickets != "number") {
                console.warn("numberOfTickets must be submitted *as a number*. (You are submitting it as a " + typeof userData.numberOfTickets + ".)");
            }
            if (!userData.userName) {
                console.warn("No userName provided.");
            }
            if (!userData.movie || !userData.movie.title || !userData.movie.genres || !userData.movie.actors || !userData.movie.movieLength) {
                console.warn("No movie provided (or, it is lacking title, genres, actors, or movieLength data.");
            }
            this.postToServer(data);
            this.submitted = true;
        }
        else {
            console.log("Already submitted.");
        }
    }
    postToServer(trialData) {
        // this is a stub while I figure out the cloudflare sitch
        console.log(trialData);
    }
    getMovies() {
        return testMovies;
    }
}
