
let lyricsData = [];
async function loadData() {
  await d3.csv("../data.csv", function(d) {
      let coord_x = parseFloat(d.x);
      let coord_y = parseFloat(d.y);
      let cluster = parseInt(d.cluster);
      var scatterData = {
        "x" : coord_x,
        "y" : coord_y,
        "cluster" : cluster,
        "sentence" : d.sentence
      };
      lyricsData.push(scatterData);
  });
}

loadData();

loadData().then(data => {
  function generateColorScheme(numColors) {
    const colors = [];
    const saturation = 100;
    const lightness = 50;
    const hueStep = 360 / numColors;

    for (let i = 0; i < numColors; i++) {
        const hue = i * hueStep;
        const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        colors.push(color);
    }
    return colors;
  }
  // set the dimensions and margins of the graph
  var margin = {top: 10, right: 30, bottom: 30, left: 60},
      width = 460 - margin.left - margin.right,
      height = 450 - margin.top - margin.bottom;  

  const minX = Math.min(...lyricsData.map(obj => obj['x']));
  const minY = Math.min(...lyricsData.map(obj => obj['y']));
  const maxX = Math.max(...lyricsData.map(obj => obj['x']));
  const maxY = Math.max(...lyricsData.map(obj => obj['y']));
  const maxCluster = Math.max(...lyricsData.map(obj => obj['cluster']));
  
  const colorScheme = generateColorScheme(maxCluster); //# of clusters gotta change that later -- find the highest cluster # and set it to that number 
  const scatter_svg = d3.select("#my_dataviz")
    .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .attr("id", "lyrics-scatterplot-svg")
    .append("g")
      .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");
          
  // const zoom = d3.zoom().scaleExtent([0.01, 100]).on('zoom', zoomed); //customize zooming extent (like up to 10X magnified in and out)
  const gGrid = scatter_svg.append("g");
  const gx = scatter_svg.append("g");
  const gy = scatter_svg.append("g");
  // scatter_svg.call(zoom);

  // scatter_svg.call(zoom).call(zoom.transform, d3.zoomIdentity);

  var xScale = d3.scaleLinear()
    .domain([minX, 1.1 * maxX])
    .range([ 0, width ]);
  // scatter_svg.append("g")
  //   .attr("transform", "translate(0," + height + ")")
  //   .call(d3.axisBottom(x));
  
  var yScale = d3.scaleLinear()
    .domain([minY, 1.1 * maxY])
    .range([ height, 0]);
  // scatter_svg.append("g")
  //   .call(d3.axisLeft(y));
  
  var xAxis = (g, xScale) => g
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisTop(xScale).ticks(12))
    .call(g => g.select(".domain").attr("display", "none")) //add this line into lyrics_plot_test line 79 
  
  var yAxis = (g, yScale) => g
  .call(d3.axisRight(yScale).ticks(12 * k))
  .call(g => g.select(".domain").attr("display", "none")) //add this line into lyrics_plot_test line 79 

  var grid = (g, xScale, yScale) => g
    .attr("stroke", "black")
    .attr("stroke-opacity", 0.1)
    .call(g => g
      .selectAll(".x")
      .data(x.ticks(12))
      .join(
        enter => enter.append("line").attr("class", "x").attr("y2", height),
        update => update,
        exit => exit.remove()
      )
        .attr("x1", d => 0.5 + x(d))
        .attr("x2", d => 0.5 + x(d)))
    .call(g => g
      .selectAll(".y")
      .data(y.ticks(12 * k))
      .join(
        enter => enter.append("line").attr("class", "y").attr("x2", width),
        update => update,
        exit => exit.remove()
      )
        .attr("y1", d => 0.5 + y(d))
        .attr("y2", d => 0.5 + y(d)));

  var tooltip = d3.select("#my_dataviz")
    .append("div")
    .style("opacity", 0)
    .attr("class", "tooltip")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "1px")
    .style("border-radius", "5px")
    .style("padding", "10px")
  
  var mouseover = function(d) {
    tooltip
      .style("opacity", 1)
  }
  
  var mousemove = function(d) {
    tooltip
      .html("Sentence: " + d.sentence + "<br>" + "Cluster: " + d.cluster)
      .style("left", (d3.mouse(this)[0]+90) + "px") // It is important to put the +90: other wise the tooltip is exactly where the point is an it creates a weird effect
      .style("top", (d3.mouse(this)[1]) + "px")
  }
  
  // A function that change this tooltip when the leaves a point: just need to set opacity to 0 again
  var mouseleave = function(d) {
    tooltip
      .transition()
      .duration(200)
      .style("opacity", 0)
  }
  
  scatter_svg.append('g')
      .attr("class", "g-sentences")
      .selectAll(".g-sentences")
      .data(lyricsData)
      .enter()
      .append("circle")
      .attr("class", "circle-sentences")
      .attr("cx", function (d) { return xScale(d.x); } )
      .attr("cy", function (d) { return yScale(d.y); } )
      .attr("r", 5)
      .style("fill", function (d) { 
        return colorScheme[d.cluster];})
      .style("opacity", 0.3)
      .style("stroke", "white")
      .on("mouseover", mouseover)
      .on("mousemove", mousemove)
      .on("mouseleave", mouseleave)

}).catch(error => {
  console.error("Error loading data:", error);
});



  // function zoomed({transform}) {
  //   if (!transform) {return;}
  //     // Check if transform is undefined 
  //   const zx = transform.rescaleX(xScale).interpolate(d3.interpolateRound);
  //   const zy = transform.rescaleY(yScale).interpolate(d3.interpolateRound);
  //   const dfsdf = document.getElementById('my_dataviz');
  //   const childGs = dfsdf.querySelectorAll('g');
  //   // const scatterCircles = document.getElementsByClassName('circle-sentences');
  //   childGs.attr("transform", transform).attr("stroke-width", 5 / transform.k);
  //   gx.call(xAxis, zx);
  //   gy.call(yAxis, zy);
  //   gGrid.call(grid, zx, zy);
  // }