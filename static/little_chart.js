function generatePlot(little_tracks_data) {
	const littleSvg = d3.select('#little-svg');
	var littleBoundingRect = littleSvg.node().getBoundingClientRect();
    var littleWidth = littleBoundingRect.width;
    var littleHeight = littleBoundingRect.height;

	littleSvg.selectAll("*").remove();
	
	var littleDrag = d3
        .drag()
        .on("start", littleDragstarted)
        .on("drag", littleDragged)
        .on("end", littleDragended);
        
    function littleDragstarted(d) {
        //your alpha hit 0 it stops! make it run again
        little_simulation.alphaTarget(0.3).restart();
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function littleDragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }
    
    function littleDragended(d) {
        little_simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
	
	var little_trackNodes = littleSvg
		.append("g")
		.attr('class', 'little-g')
		.attr("width", littleWidth)
        .attr("height", littleHeight)
        .attr("transform", "translate(0,0)")
		.selectAll(".little-g")
		.data(little_tracks_data) //i think has to be an array as the data type 
		.enter()
		.append("g")
		.attr('class', 'little-little-g')
		.call(littleDrag);

	var littleDefs = littleSvg.append("defs");

	littleDefs.selectAll(".little-track-image-pattern")
		.data(little_tracks_data)
		.enter().append("pattern")
		.attr("class", "little-track-image-pattern")
		.attr("id", function(d){
			return `little-${d.track_id}`;
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

	var little_circles = little_trackNodes
		.append("circle")
		.attr('class', 'little-circles')
		.attr('id', function(d){
			return `little-circle-${d.track_id}`
		})
		.attr("r", 8)
		.attr("cy", littleHeight / 2) //cuz its one dimensional 
		.attr("fill", function(d){
			return "url(#little-" + d.track_id + ")";
		})
		.on("mouseover", toolTipOnHover)
	
	let alignX;
	let xScale; 
	let xAxis;
	let dValue; 

	dValue = d3.max(little_tracks_data, function(d) {return d.track_popularity;});
	xScale = d3.scaleLinear([0, (1.1*dValue)], [0, littleWidth]);
	xAxis = d3.axisBottom(xScale);
	
	littleSvg.append("g")
		.attr('class', 'axis-line')
		.attr("transform", "translate(0, 150)") 
		.call(xAxis);

	alignX = d3.forceX(function(d){
		return xScale(d.track_popularity);
	}).strength(0.1);

	var little_simulation = d3.forceSimulation(little_tracks_data)
		.force("x", alignX)
		.force("y", d3.forceY(0).strength(0.1))
		.force("collide", d3.forceCollide().radius(10))
		.on("tick", little_ticked);

	function toolTipOnHover(event,d){
		let track_name = document.getElementById("track_name_output");
		let track_artists = document.getElementById("track_artists_output");
		let track_album = document.getElementById("track_album_output");
		let track_record_player = document.getElementsByClassName('record')[0];

		let curr_circle = little_tracks_data[d];
		let artists_str = "";
		for (let i = 0; i< curr_circle.track_artists.length; i++){
				artists_str = artists_str + curr_circle.track_artists[i]["track_artist_name"] + " ";
			}
		track_name.textContent = `${curr_circle.track_name}`;
		track_artists.textContent = `${artists_str}`;
		track_album.textContent = `${curr_circle.track_album}`;
		track_record_player.style.backgroundImage = `url(${curr_circle.track_image})`;

	}

	function little_ticked() {
		little_trackNodes.attr("transform", function(d) {
			return "translate(" + d.x + ", " + d.y + ")";
		})
	};
  
	d3.select("#decade").on('click', function(){
		let dMax = d3.max(little_tracks_data, function(d) {return Number(d.track_album_release_date.slice(0,4));});
		let dMin = d3.min(little_tracks_data, function(d) {return Number(d.track_album_release_date.slice(0,4));});
		xScale = d3.scaleLinear([(dMin-10), (dMax+10)], [0, littleWidth]);
		xAxis = d3.axisBottom(xScale);
		alignX = d3.forceX(function(d){
			return xScale(Number(d.track_album_release_date.slice(0,4)));
		}).strength(0.1);
		littleSvg.select('.axis-line')
			.transition()
			.duration(2000)  
			.call(xAxis);
		little_simulation 
			.force("x", alignX)
			.alphaTarget(0.25)
			.restart()
		d3.selectAll(".little-circle")
			.transition()
			.delay(0)
			.duration(2000)

	});
	d3.select("#popularity").on('click', function(){
		dValue = d3.max(little_tracks_data, function(d) {return d.track_popularity;});
		xScale = d3.scaleLinear([0, (1.1*dValue)], [0, littleWidth]);
		xAxis = d3.axisBottom(xScale);
		alignX = d3.forceX(function(d){
			return xScale(d.track_popularity);
		}).strength(0.1);
		littleSvg.select('.axis-line')
			.transition()
			.duration(2000)  
			.call(xAxis);
		little_simulation 
			.force("x", alignX)
			.alphaTarget(0.25)
			.restart()
		d3.selectAll(".little-circle")
			.transition()
			.delay(0)
			.duration(2000)
	});
	d3.select("#energy").on('click', function(){
		dValue = d3.max(little_tracks_data, function(d) {return d.track_energy;});
		xScale = d3.scaleLinear([0, (1.1*dValue)], [0, littleWidth]);
		xAxis = d3.axisBottom(xScale);
		alignX = d3.forceX(function(d){
			return xScale(d.track_energy);
		}).strength(0.1);
		littleSvg.select('.axis-line')
			.transition()
			.duration(2000)  
			.call(xAxis);
		little_simulation 
			.force("x", alignX)
			.alphaTarget(0.25)
			.restart()
		d3.selectAll(".little-circle")
			.transition()
			.delay(0)
			.duration(2000)
	});
	d3.select("#danceability").on('click', function() {
		dValue = d3.max(little_tracks_data, function(d) {return d.track_danceability;});
		xScale = d3.scaleLinear([0, (1.1*dValue)], [0, littleWidth]);
		xAxis = d3.axisBottom(xScale);
		alignX = d3.forceX(function(d){
			return xScale(d.track_danceability);
		}).strength(0.1);
		littleSvg.select('.axis-line')
			.transition()
			.duration(2000)  
			.call(xAxis);
		little_simulation 
			.force("x", alignX)
			.alphaTarget(0.25)
			.restart()
		d3.selectAll(".little-circle")
			.transition()
			.delay(0)
			.duration(2000)
	});

}
	
