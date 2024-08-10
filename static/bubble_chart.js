function create_bubbles(tracks_data){
    const svg = d3.select('#main-svg');
    var boundingRect = svg.node().getBoundingClientRect();
    var width = boundingRect.width;
    var height = boundingRect.height;
    //reset for every playlist 
    svg.selectAll("*").remove();

    var radiusRangeMin = () =>{
        if (0.2*(width/ tracks_data.length) < 1){
            return 1; //setting the most smallest amount as 1 
        }
        else{
            return 0.2*(width/ tracks_data.length);
        }
    };
    var radiusRangeMax = () => {
        if (0.8*(width/ tracks_data.length) > 100){
            return 100; //setting the most smallest amount as 1 
        }
        else{
            return 0.8*(width/ tracks_data.length);
        }
    };
    //currently range is 5 to 30 for 38(ish?) data points (take into account svg width and height dimensions )
    // a definite min is 1? 
    var radiusScale = d3.scaleSqrt().domain([1,100]).range([radiusRangeMin(),radiusRangeMax()]); //domain is the min and max of numbers within the dataset, range is for the radius size
    var trackdetailsScale = d3.scaleSqrt().domain([0,1]).range([radiusRangeMin(),radiusRangeMax()]); //domain is the min and max of numbers within the dataset, range is for the radius size

    // total_ genres: array of distinct genres represented in the dataset
    let total_genres = []; 
    // total_ decades: array of distinct decades represented in the dataset
    let total_decades = [];

    // track_genre_map: takes tracks_data and calculates the results for total_genres
    var track_genre_map = tracks_data.map(function(element){
        if (element.track_genre.length == 0){
            if (total_genres.includes("No Genre")){
                return "";
            }
            else{
                total_genres.push("No Genre");
                return "No Genre"
            }  
        }
        if (total_genres.includes(element.track_genre[0])){
            return "";
        }
        
        else{
            total_genres.push(element.track_genre[0]);
            return element.track_genre[0];
        }
    });
   
    // track_decades_map: takes tracks_data and calculates the results for total_decades
    var track_decades_map = tracks_data.map(function(element){
        if (total_decades.includes(element.track_album_release_date.slice(0,3)+"0")){
            return "";
        }
        
        else{
            total_decades.push(element.track_album_release_date.slice(0,3)+"0");
            return element.track_album_release_date.slice(0,3)+"0";
        }
    });
    let decades_index = total_decades.length;

    let genre_index = Math.floor(Math.sqrt(total_genres.length))+1;
    var positionYDecadesScale = d3.scaleLinear().domain([1,decades_index]).range([height*.10,height*.90]);

    let decades_separate = total_decades.map((element, index) => {  
        return {
            "track_decade": element,
            "y_pos": positionYDecadesScale(index+1)
        }
    });

    let decades_list; 

    var forceYDecadesSeparate = d3.forceY(function(d) {
        decades_list = decades_separate.filter((element) => {
            return (element.track_decade) == (d.track_album_release_date.slice(0,3)+"0");
        });
        return decades_list[0]["y_pos"];
    }).strength(0.1);

    //positionGenreScale takes the x and y position within the n by n array and computes the porportional positon relative to the svg element 
    var positionXGenreScale = d3.scaleLinear().domain([1,genre_index]).range([width*.10,width*.90]);
    var positionYGenreScale = d3.scaleLinear().domain([1,genre_index]).range([-height*0.7,height*0.1]); // tinker around with the math

    //genre_separate = array of objects {} that maps each genre to an evenly spread x and y position 
    let genre_separate = total_genres.map((element, index) => {
        let scale;
        if ((index+1) % genre_index == 0){
            scale = genre_index;
        }
        else{
            scale = (index+1) % genre_index;
        }
        return {
            "track_genre":element,
            "x_pos": positionXGenreScale(scale),
            "y_pos": positionYGenreScale((Math.floor(index/genre_index))+1)
        }

    });

    //forceGenreSeparate enforces the positoning from genre_separate by Genre
    var forceXGenreSeparate = d3.forceX(function(d) {
        let genre_list = genre_separate.filter((element) => {
            if (d.track_genre.length == 0){
                return element["track_genre"] == "No Genre";
            }
            return element["track_genre"] == d.track_genre[0];
        })
        return genre_list[0]["x_pos"];
    }).strength(0.1);

    var forceYGenreSeparate = d3.forceY(function(d) {
        let genre_list = genre_separate.filter((element) => {
            if (d.track_genre.length == 0){
                return element["track_genre"] == "No Genre";
            }
            return element["track_genre"] == d.track_genre[0];
        })
        return genre_list[0]["y_pos"];
    }).strength(0.1);

    //forceCombine brings the circles into the middle (recenter) 
    var forceXCombine = d3.forceX(width / 2).strength(0.05);
    var forceYCombine = d3.forceY(height / 2).strength(0.05);

    //forceCollide makes sure that the circles aren't overlaping and "bounce" from each other 
    var forceCollide = d3.forceCollide(function(d){
        return radiusScale(d.track_popularity) + (radiusRangeMin()*2); 
    });

    var drag = d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
        
    function dragstarted(d) {
        //your alpha hit 0 it stops! make it run again
        simulation.alphaTarget(0.3).restart();
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }
    
    function dragended(d) {
        // alpha min is 0, head there
        simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    var textsAndNodes = svg
        .append("g")
        .attr('class', 'main-g')
        .attr("width", width)
        .attr("height", height)
        .attr("transform", "translate(0,0)")
        .selectAll(".main-g")
        .data(tracks_data) //i think has to be an array as the data type 
        .enter()
        .append("g")
        .attr('class', 'main-little-g')
        .call(drag);

    var bigDefs = svg.append("defs");

    function ticked() {
        // translate(x, y)
        textsAndNodes.attr("transform", function(d) {
            return "translate(" + d.x + ", " + d.y + ")";
        })
    };

    bigDefs.selectAll(".track-image-pattern")
        .data(tracks_data)
        .enter().append("pattern")
        .attr("class", "track-image-pattern")
        .attr("id", function(d){
            return d.track_id
        })
        .attr("height", "100%")
        .attr("width", "100%")
        .attr("patternContentUnits", "objectBoundingBox")
        .append("image")
        .attr("height", 1)
        .attr("width", 1)
        .attr("preserveAspectRatio", "none")
        .attr("xmlns:xlink", "http://www.w3.org/1999/xlink")
        .attr("xlink:href", function(d){
            if (d.track_image == "NO_IMAGES"){
                return "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fwww.tassal.com.au%2Fwp-content%2Fuploads%2F2018%2F02%2Fblue-background-PNG-1024x668.png&f=1&nofb=1&ipt=d98b65d14890e60f22cbfbb0cedee0f783b9e5a648cf5bf484b77a95179ffcb4&ipo=images"
            }
            return d.track_image})
    
    var circles = textsAndNodes
        .append("circle")
        .attr('class', 'main-circles')
        .attr('id', function(d){
            return `circle-${d.track_id}`
        })
        .attr("r", function(d){
            return radiusScale(d.track_popularity); //another attribute at the end
        })
        .attr("fill", function(d){
            return "url(#" + d.track_id + ")";
        })
        .on("mouseover", toolTipOnHover)
    
    function toolTipOnHover(event,d){
        let track_name = document.getElementById("track_name_output");
        let track_artists = document.getElementById("track_artists_output");
        let track_album = document.getElementById("track_album_output");
        let track_record_player = document.getElementsByClassName('record')[0];
  
        let curr_circle = tracks_data[d];
        let artists_str = "";
        for (let i = 0; i< curr_circle.track_artists.length; i++){
                artists_str = artists_str + curr_circle.track_artists[i]["track_artist_name"] + " ";
            }

        track_name.textContent = `${curr_circle.track_name}`;
        track_artists.textContent = `${artists_str}`;
        track_album.textContent = `${curr_circle.track_album}`;
        track_record_player.style.backgroundImage = `url(${curr_circle.track_image})`;

    }
    var simulation = d3
        .forceSimulation(tracks_data)
        .force("charge", d3.forceManyBody().strength(radiusRangeMin()*0.5))  
        .force("center", d3.forceCenter(width / 2, height / 2)) //gonna replace this 
        .force("x", forceXCombine)
        .force("y", forceYCombine) 
        .force("collide", forceCollide)
        .on("tick", ticked);

    var genre_button = document.getElementById("genre");

    for (let i = 0; i<genre_separate.length; i++){
        svg.append("text").data(genre_separate).attr("class", "genre_text").style("display", "none").style("font-size", "8px").attr("transform", "translate("+ (genre_separate[i]["x_pos"]) + ", " + (genre_separate[i]["y_pos"] + 600) + ")" ).attr("fill", "green").text(genre_separate[i]["track_genre"])
    }

    $(genre_button).on('click', function(){
        let get_decades_text = d3.selectAll(".decades_text");
        if (get_decades_text){
            get_decades_text.style("visibility", "hidden");
        }
        let get_genre_text_labels = document.getElementsByClassName("genre_text");
        for (let i = 0 ; i< get_genre_text_labels.length; i++){
            get_genre_text_labels[i].style.visibility = "visible";
        }
        $(get_genre_text_labels).delay(4000).fadeIn(1000);
    });

    $(genre_button).on('click', function(){
        d3.selectAll(".main-circles")
            .transition()
            .delay(0)
            .duration(2000)
        simulation
            .force("x", forceXGenreSeparate)
            .force("y", forceYGenreSeparate)
            .alphaTarget(0.25)
            .restart()
    });

    //making the decade labels 
    var decade_button = document.getElementById("decade");
    for (let i = 0; i<decades_separate.length; i++){
        svg.append("text").data(decades_separate).attr("class", "decades_text").style("display", "none").style("font-size", "12px").attr("transform", "translate(100, " + (decades_separate[i]["y_pos"] + 20) + ")" ).attr("fill", "green").text(decades_separate[i]["track_decade"])
    }
    
    $(decade_button).on('click', function(){
        let get_genre_text = d3.selectAll(".genre_text");
        if (get_genre_text){
            get_genre_text.style("visibility", "hidden");
        }
        let get_decade_text_labels = document.getElementsByClassName("decades_text");
        for (let i = 0 ; i< get_decade_text_labels.length; i++){
            get_decade_text_labels[i].style.visibility = "visible";
        }
        $(get_decade_text_labels).delay(3000).fadeIn(1000);
    });

    $(decade_button).on('click', function(){
        d3.selectAll(".main-circles")
            .transition()
            .delay(0)
            .duration(2000)
        simulation
            .force("y", forceYDecadesSeparate)
            .alphaTarget(0.25)
            .restart()
    });

    var combine_button = document.getElementById("combine");
    var energy_button = document.getElementById("energy");
    var popularity_button = document.getElementById("popularity");
    var danceability_button = document.getElementById("danceability");


    $(combine_button).on('click', function(){
        let get_decades_text = d3.selectAll(".decades_text");
        if (get_decades_text){
            get_decades_text.style("visibility", "hidden");
        }
        let get_genre_text = d3.selectAll(".genre_text");
        if (get_genre_text){
            get_genre_text.style("visibility", "hidden");
        }
    });

    $(combine_button).on('click', function(){
        d3.selectAll(".main-circles")
            .transition()
            .delay(0)
            .duration(2000)
        simulation
            .force("x", forceXCombine)
            .force("y", forceYCombine)
            .alphaTarget(0.25)
            .restart()
    });

    $(popularity_button).on('click', function(){
        simulation 
            .force("collide", forceCollide)
            .alphaTarget(0.25)
            .restart()
        d3.selectAll(".main-circles")
            .transition()
            .delay(0)
            .duration(2000)
            .attr("r", function(d){
                return radiusScale(d.track_popularity); //another attribute at the end
            })
        
    });

    $(energy_button).on('click', function(){
        simulation 
            .force("collide", forceCollide)
            .alphaTarget(0.25)
            .restart()
        d3.selectAll(".main-circles")
            .transition()
            .delay(0)
            .duration(2000)
            .attr("r", function(d){
                return trackdetailsScale(d.track_energy); //another attribute at the end
            })
    });

    $(danceability_button).on('click', function(){
        simulation 
            .force("collide", forceCollide)
            .alphaTarget(0.25)
            .restart()
        d3.selectAll(".main-circles")
            .transition()
            .delay(0)
            .duration(2000)
            .attr("r", function(d){
                return trackdetailsScale(d.track_danceability); //another attribute at the end
            })
    });
}

