// change this so that this is one main function with the parameter is the name of the csv file of the playlist of interest. 
// call this function in main.js, under each playlist dial click --> write onclick condition for lyrics and call this function with appropriate csv file name

// maybe instead of replacing the main-svg with all these contents and trying to revert back once clicking on any other button, hide? display none the svg and replace it with an svg specifically for lyric analysis...
// at the top of the bubble_chart.js algo, make sure to change the main-svg visibility to visible and the lyrics svg visibility to none

//playlist_number, playlist_title, song_numbers
function generateLyricsPlot(playlist_number, playlist_title, song_numbers) {
    let lyricsData = [];
    let file_path = "../data/playlist-"+ (playlist_number.toString())+ "-lyric-plot-data.csv";
    // let file_path = '../data/data.csv'
    async function loadData() { 
        await d3.csv(file_path, function(d) {
            let coord_x = parseFloat(d.x);
            let coord_y = parseFloat(d.y);
            let cluster = d.cluster; 
            var scatterData = {
                "x" : coord_x,
                "y" : coord_y,
                "cluster" : cluster,
                "sentence" : d.sentence,
                "song-title" : d['song-title'],
                "song-artist": d['song-artist'],
                "cosine-similarity-score" : d['cosine_simiarity_score'],
                "confidence-level" : d['confidence_level']
            };
            lyricsData.push(scatterData);
        });
    }

    loadData();

    loadData().then(data => {
        document.getElementById("lyric-tooltip-playlist-name").innerText = playlist_title;
        document.getElementById("lyric-tooltip-song-num").innerText = song_numbers;
        d3.select('#lyrics-scatterplot-svg').selectAll("*").remove();
        d3.select('#areaChart').selectAll("*").remove();

        function generateColorScheme(numColors) {
            const colors = [];
            const saturation = 70;
            const lightness = 50;
            const hueStep = 360 / numColors;

            for (let i = 0; i < numColors; i++) {
                const hue = i * hueStep;
                const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                colors.push(color);
            }
            return colors;
        }

        function updateProgressBar(numericalValue, maxValue, i) {
            const progressBar = document.querySelectorAll('.progress-bar')[i];    
            const percentage = (numericalValue / maxValue) * 100;
            if (i == 0) {
                document.getElementById('lyric-x-coord').innerText = numericalValue.toFixed(4);
            } 
            else if (i == 1) {
                document.getElementById('lyric-y-coord').innerText = numericalValue.toFixed(4);
            }
            else {
                document.getElementById('lyric-confidence-level').innerText = parseFloat(numericalValue).toFixed(4);
            }
            if (percentage >= 100) {
                progressBar.style.width = '100%';
                progressBar.style.backgroundColor = '#4895ef';
                progressBar.parentElement.style.boxShadow = '0 0 5px #4895ef';
            } else {
                progressBar.style.width = `${percentage}%`;
                // progressBar.parentElement.style.boxShadow = 'none';
            }
        }

        function updateCircleProgressBar(value, cluster) {
            const circleForeground = document.getElementById('circle-foreground');
            const circlePercentage = document.getElementById('circle-percentage');
            const radius = 40;
            const circumference = 2 * Math.PI * radius;
            let offset = circumference - (circumference * value); 
            circleForeground.setAttribute('stroke', colorScheme[cluster]);
            circleForeground.style.strokeDashoffset = offset;
            circlePercentage.textContent = Math.round(value * 100) + '%';
        }

        // Set the dimensions and margins of the graph
        var margin = { top: 10, right: 30, bottom: 30, left: 60 },
            width = 708 - margin.left - margin.right,
            height = 722.6953125 - margin.top - margin.bottom;

        const minX = Math.min(...lyricsData.map(obj => obj['x']));
        const minY = Math.min(...lyricsData.map(obj => obj['y']));
        const maxX = Math.max(...lyricsData.map(obj => obj['x']));
        const maxY = Math.max(...lyricsData.map(obj => obj['y']));

        // Define scales and axes
        var xScale = d3.scaleLinear()
            .domain([minX, maxX])
            .range([0, width]);

        var yScale = d3.scaleLinear()
            .domain([minY, maxY])
            .range([height, 0]);

        const uniqueClusters = new Set(lyricsData.map(obj => obj['cluster']));
        const clusterCounts = lyricsData.reduce((acc, obj) => {
            acc[obj['cluster']] = (acc[obj['cluster']] || 0) + 1;
            return acc;
        }, {});
        const colorArray = generateColorScheme(uniqueClusters.size);
        const colorScheme = {};
        let i = 0;
        let j = 1;
        uniqueClusters.forEach(cluster => {
            colorScheme[cluster] = colorArray[i];
            let clusterElement = document.createElement('li');
            clusterElement.innerHTML = `<span style = "color: ${colorArray[i]}">${cluster}</span> <span style = "opacity: 0.7; font-size: 0.4em;">(${((clusterCounts[cluster]/lyricsData.length)*100).toFixed(2)}%)</span>`;
            // clusterElement.style.color = colorArray[i];
            let lyricClusterList = document.getElementById(`lyric-cluster-list-${j}`);
            lyricClusterList.append(clusterElement);
            i++;
            if (j == 1) {
                j = 2;
            } else {
                j = 1;
            }
        });

        let eachSongData = {};

        // Assuming loadData() is already called to populate lyricsData

        // Iterate through lyricsData to organize the data
        lyricsData.forEach(data => {
            const songTitle = data['song-title'];
            if (!eachSongData[songTitle]) {
                eachSongData[songTitle] = { x: [], y: [] };
            }
            eachSongData[songTitle].x.push(data.x);
            eachSongData[songTitle].y.push(data.y);
        });

        function updatesongDataCoords() {
            Object.keys(eachSongData).forEach(song => {
                const songData = eachSongData[song];
                songData.x = songData.x.map(xValue => xScale(xValue));
                songData.y = songData.y.map(yValue => yScale(yValue));
            });
        }
        
        updatesongDataCoords();
        
        function createSongAreaChart(songName, xPoint, yPoint) {
            let songData = eachSongData[songName].x.map((xValue, index) => {
                return { x: xValue, y: eachSongData[songName].y[index] };
            });
        
            // Sort the dataset by x values
            songData.sort((a, b) => a.x - b.x);
        
            // Remove duplicates
            songData = songData.filter((value, index, self) =>
                index === self.findIndex((t) => (
                    t.x === value.x && t.y === value.y
                ))
            );
        
            const areaCanvas = document.getElementById('areaChart');
            const minX = Math.min(...eachSongData[songName].x);
            const minY = Math.min(...eachSongData[songName].y);
            const maxX = Math.max(...eachSongData[songName].x);
            const maxY = Math.max(...eachSongData[songName].y);
                    
            const data = {
                datasets: [{
                    label: songName,
                    data: songData,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)', // Area fill color
                    borderColor: 'rgba(54, 162, 235, 1)', // Border color
                    borderWidth: 1,
                    pointRadius: 0, // Ensure no points are displayed
                    fill: true,
                    tension: 0.4
                }]
            };
        
            const config = {
                type: 'line',
                data: data,
                options: {
                    scales: {
                        x: {
                            type: 'linear',
                            position: 'bottom',
                            min: minX,
                            max: maxX // Adjust as needed
                        },
                        y: {
                            type: 'linear',
                            min: minY,
                            max: maxY // Adjust as needed
                        }
                    },
                    plugins: {
                        tooltip: {
                            enabled: false // Disable default tooltip
                        }
                    },
                    elements: {
                        point: {
                            radius: 0 // Ensure no points are displayed
                        }
                    }
                }
            };
        

            // Check if the canvas element already has a chart instance
            if (areaCanvas.chart) {
                areaCanvas.chart.destroy();
            }
            // Create new chart and associate it with the canvas element
            areaCanvas.chart = new Chart(areaCanvas, config);
        }

        // Doughnut chart data
        const doughnutData = {
            labels: uniqueClusters,
            datasets: [{
                data: Object.values(clusterCounts),
                backgroundColor: colorArray,
                borderWidth: 1
            }]
        };

        // Chart configuration
        const doughnutConfig = {
            type: 'doughnut',
            data: doughnutData,
            options: {
                responsive: true,
                cutout: '40%', // Adjust the size of the hole in the middle (optional)
                plugins: {
                    legend: {
                        position: 'bottom', // Position of the legend
                    },
                }
            },
        };

        // Create the doughnut chart
        const existingChart = Chart.getChart('doughnutChart');
        if (existingChart) {
            existingChart.destroy();
        }
        const myChart = new Chart(document.getElementById('doughnutChart'), doughnutConfig);

        const scatter_svg = d3.select("#lyrics-scatterplot-svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // let currentTransform = d3.zoomIdentity; // Initialize to identity transformation
        // Define zoom behavior
        // const zoom = d3.zoom()
        //     .scaleExtent([-0.001, 100]) // Set the zoom scale limits
        //     .on('zoom', zoomed);

        // Apply zoom behavior to the SVG container
        // scatter_svg.call(zoom);

        
        let new_xScale = xScale; 
        let new_yScale = yScale;
        const xAxis = d3.axisBottom(xScale).ticks(12);
        const yAxis = d3.axisLeft(yScale).ticks(12);

        // Draw axes
        scatter_svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        scatter_svg.append("g")
            .attr("class", "y-axis")
            .call(yAxis);

        var tooltip = d3.select(".lyrics-tooltip")
            // .style("opacity", 0);

        var mouseover = function(d) {
            tooltip
                .style("opacity", 1)
        }
        
        var mousemove = function(d) {
            tooltip.select("#lyrics-stanza").text('"' + d.sentence + '"');
            tooltip.select("#cluster-string").text(d.cluster + ": ");
            tooltip.select("#cluster-string").style("color", colorScheme[d.cluster]);
            tooltip.select("#lyrics-song-name").text(d['song-title'] + ", ");
            tooltip.select("#lyrics-artist-name").text(d['song-artist']);
            // tooltip.select("#lyric-cosine-similarity-score").text(d['cosine-similarity-score']);
            updateProgressBar(d.x, xScale(maxX), 0);
            updateProgressBar(d.y, yScale(minY), 1);
            updateProgressBar(d['confidence-level'], 1, 2);
            createSongAreaChart(d['song-title'],d.x, d.y);
            updateCircleProgressBar(d['cosine-similarity-score'], d.cluster);
            // tooltip
            //     .style("left", (d3.mouse(this)[0]+90) + "px") // It is important to put the +90: other wise the tooltip is exactly where the point is an it creates a weird effect
            //     .style("top", (d3.mouse(this)[1]) + "px")
        }
        
        // A function that change this tooltip when the leaves a point: just need to set opacity to 0 again
        // var mouseleave = function(d) {
        //     tooltip
        //         .transition()
        //         .duration(200)
        //         .style("opacity", 0)
        // }

        // Define drag behavior
        var lyricDrag = d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);

        // function dragstarted(event, d) {
        //     if (!event.active) lyricSimulation.alphaTarget(0.3).restart();
        //     d.fx = d.x;
        //     d.fy = d.y;
        // }

        // function dragged(event, d) {
        //     d.fx = xScale.invert(event.x);
        //     d.fy = yScale.invert(event.y);
        // }

        // function dragended(event, d) {
        //     if (!event.active) lyricSimulation.alphaTarget(0);
        //     d.fx = null;
        //     d.fy = null;
        // }

        function dragstarted(d) {
            //your alpha hit 0 it stops! make it run again
            lyricSimulation.alphaTarget(0.3).restart();
            // d.fx = d3.event.x;
            // d.fy = d3.event.y;
            // d.fx = currentTransform.rescaleX(xScale).invert(d3.event.x);
            // d.fy = currentTransform.rescaleY(yScale).invert(d3.event.y);
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(d) {
            d.fx = d3.event.x;
            d.fy = d3.event.y;
            // d.fx = currentTransform.rescaleX(xScale).invert(d3.event.x);
            // d.fy = currentTransform.rescaleY(yScale).invert(d3.event.y);
            // d.fx = new_xScale.invert(d3.event.x);
            // d.fy = new_yScale.invert(d3.event.y);
        }
        
        function dragended(d) {
            // alpha min is 0, head there
            lyricSimulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        // Draw scatterplot points
        const lyricCircles = scatter_svg.selectAll(".circle-sentences")
            .data(lyricsData)
            .enter().append("circle")
            .attr("class", "circle-sentences")
            .attr("cx", function (d) { return xScale(d.x); })
            .attr("cy", function (d) { return yScale(d.y); })
            .attr("r", 5)
            .style("fill", function (d) { return colorScheme[d.cluster]; }) //this is where ultimately id link track image 
            .style("opacity", 0.3)
            .style("stroke", "white")
            .on("mouseover", mouseover)
            .on("mousemove", mousemove)
            .call(lyricDrag);
            // .on("mouseleave", mouseleave);

        // Create force simulation
        const lyricSimulation = d3.forceSimulation(lyricsData)
            .force("x", d3.forceX(function (d) { return xScale(d.x); }).strength(2))
            .force("y", d3.forceY(function (d) { return yScale(d.y); }).strength(2))
            .force("collide", d3.forceCollide(5)) // play around with this value
            .on("tick", ticked);

        function ticked() {
            lyricCircles
                .attr("cx",function (d) { return (d.x); })
                .attr("cy", function (d) { return (d.y); });
        }

        // Zoom function
        // function zoomed() {
        //     // currentTransform = event.transform;
        //     const new_xScale = currentTransform.rescaleX(xScale);
        //     const new_yScale = currentTransform.rescaleY(yScale);
        //     // const { transform } = d3.event;
        //     // const new_xScale = transform.rescaleX(xScale);
        //     // const new_yScale = transform.rescaleY(yScale);
        //     scatter_svg.select(".x-axis").call(xAxis.scale(new_xScale));
        //     scatter_svg.select(".y-axis").call(yAxis.scale(new_yScale));
        //     scatter_svg.selectAll(".circle-sentences")
        //         .attr("cx", function (d) { return new_xScale(d.x); })
        //         .attr("cy", function (d) { return new_yScale(d.y); });
        // }
    });

}

// generateLyricsPlot();