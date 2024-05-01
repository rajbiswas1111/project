<?php
    error_reporting(0);
    include("connection.php");

    $query = "SELECT * FROM data1";
    $data = mysqli_query($conn, $query);

    $total_row = mysqli_num_rows($data);
                                      
   
?>
